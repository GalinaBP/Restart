package ru.restart.app.auth.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.restart.app.auth.domain.PasswordResetToken;
import ru.restart.app.auth.domain.PasswordResetTokenRepository;
import ru.restart.app.auth.domain.UserAccount;
import ru.restart.app.auth.domain.UserAccountRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Forgot-password use cases. Request and confirmation are both enumeration-safe: an unknown email
 * gets the same 204 as a known one, and a bad token gets one uniform error whether it is wrong,
 * expired, or already spent. Tokens live for {@link #TOKEN_TTL}, are single-use, and only their
 * SHA-256 is persisted.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    static final Duration TOKEN_TTL = Duration.ofHours(1);
    /** 32 random bytes → 43 base64url chars; plenty against online guessing even without rate limits. */
    private static final int TOKEN_BYTES = 32;

    private final UserAccountRepository accounts;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final ResetLinkSender sender;
    private final SecureRandom random = new SecureRandom();
    /** Frontend origin the mailed link points at; resolved once at startup. */
    private final String linkBase;

    public PasswordResetService(UserAccountRepository accounts, PasswordResetTokenRepository tokens,
                                PasswordEncoder passwordEncoder, Clock clock, ResetLinkSender sender,
                                @Value("${restart.reset.link-base-url:}") String linkBaseUrl,
                                @Value("${app.cors.allowed-origins:}") String corsOrigins) {
        this.accounts = accounts;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        this.sender = sender;
        this.linkBase = resolveLinkBase(linkBaseUrl, corsOrigins);
    }

    /**
     * Issues a fresh token and hands the reset link to the sender. Silently a no-op for unknown
     * emails, so the endpoint's response does not reveal which emails are registered.
     */
    @Transactional
    public void requestReset(String email) {
        UserAccount account = accounts.findByEmail(UserAccount.normalizeEmail(email)).orElse(null);
        if (account == null) {
            log.debug("Password reset requested for an unknown email; answered as if sent");
            return;
        }
        tokens.deleteAllForUser(account.id());
        String rawToken = generateToken();
        tokens.save(PasswordResetToken.issue(
                account.id(), hash(rawToken), clock.instant().plus(TOKEN_TTL)));
        sender.send(account.email(), linkBase + "/auth/reset?token=" + rawToken);
    }

    /** Consumes the token and stores the new password hash. One uniform error for any bad token. */
    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        Instant now = clock.instant();
        PasswordResetToken token = tokens.findByTokenHash(hash(rawToken))
                .filter(t -> t.isUsable(now))
                .orElseThrow(InvalidResetLinkException::new);
        UserAccount account = accounts.findById(token.userId())
                .orElseThrow(InvalidResetLinkException::new);
        accounts.save(new UserAccount(account.id(), account.email(),
                passwordEncoder.encode(newPassword), account.role()));
        tokens.save(token.markUsed(now));
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /**
     * Explicit {@code restart.reset.link-base-url} wins; otherwise the first CORS origin — on a
     * real deployment that is exactly the frontend domain, so no extra configuration is required.
     */
    private static String resolveLinkBase(String configured, String corsOrigins) {
        String base = !configured.isBlank() ? configured : corsOrigins.split(",")[0];
        base = base.trim();
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }
}
