package ru.restart.app.auth.application;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.restart.app.auth.domain.UserAccount;
import ru.restart.app.auth.domain.UserAccountRepository;
import ru.restart.app.common.security.CurrentUser;

/**
 * Use cases of the auth module: register, login, refresh, and the current-user profile. Tokens are
 * stateless (nothing is stored per session); revocation-on-demand is a known trade-off, acceptable
 * while the product has no high-risk actions behind a session.
 */
@Service
public class AuthService {

    private final UserAccountRepository accounts;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;
    private final CurrentUser currentUser;

    /**
     * Hash of a throwaway value. When login hits an unknown email we still run one password check
     * against it, so "no such account" and "wrong password" take similar time and the response does
     * not leak which emails are registered.
     */
    private final String timingDummyHash;

    public AuthService(UserAccountRepository accounts, PasswordEncoder passwordEncoder,
                       TokenService tokens, CurrentUser currentUser) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.currentUser = currentUser;
        this.timingDummyHash = passwordEncoder.encode(java.util.UUID.randomUUID().toString());
    }

    @Transactional
    public IssuedTokens register(String email, String rawPassword) {
        String normalized = UserAccount.normalizeEmail(email);
        if (accounts.existsByEmail(normalized)) {
            throw new EmailAlreadyRegisteredException();
        }
        UserAccount account = UserAccount.register(normalized, passwordEncoder.encode(rawPassword));
        return tokens.issue(accounts.save(account));
    }

    @Transactional(readOnly = true)
    public IssuedTokens login(String email, String rawPassword) {
        UserAccount account = accounts.findByEmail(UserAccount.normalizeEmail(email))
                .orElse(null);
        String hash = account != null ? account.passwordHash() : timingDummyHash;
        if (!passwordEncoder.matches(rawPassword, hash) || account == null) {
            throw new InvalidCredentialsException();
        }
        return tokens.issue(account);
    }

    @Transactional(readOnly = true)
    public IssuedTokens refresh(String refreshToken) {
        return tokens.parseRefreshToken(refreshToken)
                .flatMap(accounts::findById)
                .map(tokens::issue)
                .orElseThrow(SessionExpiredException::new);
    }

    /** The account of the caller. The DB lookup confirms the account still exists, not just the token. */
    @Transactional(readOnly = true)
    public UserAccount me() {
        return accounts.findById(currentUser.require().userId())
                .orElseThrow(SessionExpiredException::new);
    }
}
