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

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    static final Duration TOKEN_TTL = Duration.ofHours(1);
    private static final int TOKEN_BYTES = 32;

    private final UserAccountRepository accounts;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final ResetLinkSender sender;
    private final SecureRandom random = new SecureRandom();
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

    private static String resolveLinkBase(String configured, String corsOrigins) {
        String base = !configured.isBlank() ? configured : corsOrigins.split(",")[0];
        base = base.trim();
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }
}
