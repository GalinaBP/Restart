package ru.restart.app.auth.application;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.restart.app.auth.domain.UserAccount;
import ru.restart.app.auth.domain.UserAccountRepository;
import ru.restart.app.common.security.CurrentUser;

@Service
public class AuthService {

    private final UserAccountRepository accounts;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;
    private final CurrentUser currentUser;
    private final boolean registrationEnabled;

    private final String timingDummyHash;

    public AuthService(UserAccountRepository accounts, PasswordEncoder passwordEncoder,
                       TokenService tokens, CurrentUser currentUser,
                       @org.springframework.beans.factory.annotation.Value(
                               "${restart.registration.enabled:true}") boolean registrationEnabled) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.currentUser = currentUser;
        this.registrationEnabled = registrationEnabled;
        this.timingDummyHash = passwordEncoder.encode(java.util.UUID.randomUUID().toString());
    }

    @Transactional
    public IssuedTokens register(String email, String rawPassword) {
        if (!registrationEnabled) {
            throw new RegistrationClosedException();
        }
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

    @Transactional(readOnly = true)
    public UserAccount me() {
        return accounts.findById(currentUser.require().userId())
                .orElseThrow(SessionExpiredException::new);
    }
}
