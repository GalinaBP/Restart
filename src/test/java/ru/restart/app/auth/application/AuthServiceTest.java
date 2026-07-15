package ru.restart.app.auth.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import ru.restart.app.auth.domain.UserAccount;
import ru.restart.app.auth.domain.UserAccountRepository;
import ru.restart.app.auth.domain.UserRole;
import ru.restart.app.common.security.AuthenticatedUser;
import ru.restart.app.common.security.CurrentUser;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

/**
 * Use-case tests with an in-memory repository, the real password encoder, and a stub token
 * service — no mocks of what we own, no Spring context.
 */
class AuthServiceTest {

    private final InMemoryAccounts accounts = new InMemoryAccounts();
    private final PasswordEncoder encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
    private final StubTokens tokens = new StubTokens();
    private final StubCurrentUser currentUser = new StubCurrentUser();

    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(accounts, encoder, tokens, currentUser);
    }

    @Test
    void registerStoresNormalizedEmailAndHashedPassword() {
        service.register("  New.User@Mail.RU ", "correct-horse-1");

        UserAccount stored = accounts.findByEmail("new.user@mail.ru").orElseThrow();
        assertThat(stored.role()).isEqualTo(UserRole.USER);
        assertThat(stored.passwordHash()).doesNotContain("correct-horse-1");
        assertThat(encoder.matches("correct-horse-1", stored.passwordHash())).isTrue();
    }

    @Test
    void registerRejectsDuplicateEmailIgnoringCase() {
        service.register("user@mail.ru", "correct-horse-1");

        assertThatExceptionOfType(EmailAlreadyRegisteredException.class)
                .isThrownBy(() -> service.register("USER@mail.ru", "other-password-2"));
    }

    @Test
    void loginReturnsTokensForValidCredentials() {
        service.register("user@mail.ru", "correct-horse-1");

        IssuedTokens issued = service.login("User@Mail.ru", "correct-horse-1");

        assertThat(issued.accessToken()).contains("user@mail.ru");
    }

    @Test
    void loginFailsUniformlyForUnknownEmailAndWrongPassword() {
        service.register("user@mail.ru", "correct-horse-1");

        assertThatExceptionOfType(InvalidCredentialsException.class)
                .isThrownBy(() -> service.login("user@mail.ru", "wrong-password"));
        assertThatExceptionOfType(InvalidCredentialsException.class)
                .isThrownBy(() -> service.login("nobody@mail.ru", "correct-horse-1"));
    }

    @Test
    void refreshExchangesAValidTokenForANewPair() {
        IssuedTokens first = service.register("user@mail.ru", "correct-horse-1");

        IssuedTokens next = service.refresh(first.refreshToken());

        assertThat(next.accessToken()).contains("user@mail.ru");
    }

    @Test
    void refreshRejectsUnknownToken() {
        assertThatExceptionOfType(SessionExpiredException.class)
                .isThrownBy(() -> service.refresh("stale-token"));
    }

    @Test
    void meReturnsTheCallersAccount() {
        service.register("user@mail.ru", "correct-horse-1");
        UserAccount stored = accounts.findByEmail("user@mail.ru").orElseThrow();
        currentUser.principal = new AuthenticatedUser(stored.id(), stored.email(), "ROLE_USER");

        assertThat(service.me().email()).isEqualTo("user@mail.ru");
    }

    @Test
    void meFailsWhenTheAccountBehindTheTokenIsGone() {
        currentUser.principal = new AuthenticatedUser(UUID.randomUUID(), "ghost@mail.ru", "ROLE_USER");

        assertThatExceptionOfType(SessionExpiredException.class).isThrownBy(service::me);
    }

    // --- test doubles -----------------------------------------------------------

    private static final class InMemoryAccounts implements UserAccountRepository {
        private final Map<UUID, UserAccount> byId = new HashMap<>();

        @Override
        public UserAccount save(UserAccount account) {
            byId.put(account.id(), account);
            return account;
        }

        @Override
        public Optional<UserAccount> findById(UUID id) {
            return Optional.ofNullable(byId.get(id));
        }

        @Override
        public Optional<UserAccount> findByEmail(String email) {
            return byId.values().stream().filter(a -> a.email().equals(email)).findFirst();
        }

        @Override
        public boolean existsByEmail(String email) {
            return findByEmail(email).isPresent();
        }
    }

    /** Fake tokens that encode just enough (id + email) to assert flows without real JWTs. */
    private static final class StubTokens implements TokenService {
        @Override
        public IssuedTokens issue(UserAccount account) {
            return new IssuedTokens("access:" + account.email(), "refresh:" + account.id(), 900);
        }

        @Override
        public Optional<UUID> parseRefreshToken(String refreshToken) {
            return refreshToken.startsWith("refresh:")
                    ? Optional.of(UUID.fromString(refreshToken.substring("refresh:".length())))
                    : Optional.empty();
        }
    }

    private static final class StubCurrentUser implements CurrentUser {
        private AuthenticatedUser principal;

        @Override
        public Optional<AuthenticatedUser> get() {
            return Optional.ofNullable(principal);
        }

        @Override
        public AuthenticatedUser require() {
            return get().orElseThrow(() -> new AuthenticationCredentialsNotFoundException("none"));
        }
    }
}
