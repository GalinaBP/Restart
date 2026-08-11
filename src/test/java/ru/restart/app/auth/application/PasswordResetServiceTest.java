package ru.restart.app.auth.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import ru.restart.app.auth.domain.PasswordResetToken;
import ru.restart.app.auth.domain.PasswordResetTokenRepository;
import ru.restart.app.auth.domain.UserAccount;
import ru.restart.app.auth.domain.UserAccountRepository;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class PasswordResetServiceTest {

    private static final String EMAIL = "user@mail.ru";
    private static final String OLD_PASSWORD = "old-password-1";
    private static final String NEW_PASSWORD = "new-password-2";

    private final InMemoryAccounts accounts = new InMemoryAccounts();
    private final InMemoryTokens tokens = new InMemoryTokens();
    private final PasswordEncoder encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
    private final MutableClock clock = new MutableClock();
    private final RecordingSender sender = new RecordingSender();

    private PasswordResetService service;

    @BeforeEach
    void setUp() {
        service = new PasswordResetService(accounts, tokens, encoder, clock, sender,
                "http://localhost:3000", "");
        accounts.save(UserAccount.register(EMAIL, encoder.encode(OLD_PASSWORD)));
    }

    @Test
    void requestMailsALinkAndStoresOnlyTheTokenHash() {
        service.requestReset("  User@Mail.RU ");

        assertThat(sender.links).hasSize(1);
        assertThat(sender.lastEmail).isEqualTo(EMAIL);
        String link = sender.links.getFirst();
        assertThat(link).startsWith("http://localhost:3000/auth/reset?token=");
        String rawToken = tokenOf(link);
        assertThat(tokens.all()).hasSize(1);
        PasswordResetToken stored = tokens.all().getFirst();
        assertThat(stored.tokenHash()).isNotEqualTo(rawToken)
                .isEqualTo(PasswordResetService.hash(rawToken));
    }

    @Test
    void requestForAnUnknownEmailSendsNothingAndDoesNotFail() {
        service.requestReset("nobody@mail.ru");

        assertThat(sender.links).isEmpty();
        assertThat(tokens.all()).isEmpty();
    }

    @Test
    void resetWithTheMailedTokenReplacesThePassword() {
        service.requestReset(EMAIL);

        service.resetPassword(tokenOf(sender.links.getFirst()), NEW_PASSWORD);

        UserAccount account = accounts.findByEmail(EMAIL).orElseThrow();
        assertThat(encoder.matches(NEW_PASSWORD, account.passwordHash())).isTrue();
        assertThat(encoder.matches(OLD_PASSWORD, account.passwordHash())).isFalse();
    }

    @Test
    void tokenIsSingleUse() {
        service.requestReset(EMAIL);
        String token = tokenOf(sender.links.getFirst());
        service.resetPassword(token, NEW_PASSWORD);

        assertThatExceptionOfType(InvalidResetLinkException.class)
                .isThrownBy(() -> service.resetPassword(token, "third-password-3"));
    }

    @Test
    void tokenExpiresAfterAnHour() {
        service.requestReset(EMAIL);
        clock.advance(Duration.ofMinutes(61));

        assertThatExceptionOfType(InvalidResetLinkException.class)
                .isThrownBy(() -> service.resetPassword(tokenOf(sender.links.getFirst()), NEW_PASSWORD));
    }

    @Test
    void aNewRequestRetiresTheOldLink() {
        service.requestReset(EMAIL);
        String first = tokenOf(sender.links.getFirst());
        service.requestReset(EMAIL);
        String second = tokenOf(sender.links.getLast());

        assertThatExceptionOfType(InvalidResetLinkException.class)
                .isThrownBy(() -> service.resetPassword(first, NEW_PASSWORD));
        service.resetPassword(second, NEW_PASSWORD);
        assertThat(encoder.matches(NEW_PASSWORD,
                accounts.findByEmail(EMAIL).orElseThrow().passwordHash())).isTrue();
    }

    @Test
    void madeUpTokenIsRejected() {
        assertThatExceptionOfType(InvalidResetLinkException.class)
                .isThrownBy(() -> service.resetPassword("made-up-token", NEW_PASSWORD));
    }

    @Test
    void linkBaseFallsBackToTheFirstCorsOrigin() {
        PasswordResetService corsBased = new PasswordResetService(accounts, tokens, encoder, clock,
                sender, "", "https://front.example, https://other.example");

        corsBased.requestReset(EMAIL);

        assertThat(sender.links.getLast()).startsWith("https://front.example/auth/reset?token=");
    }

    private static String tokenOf(String link) {
        return link.substring(link.indexOf("token=") + "token=".length());
    }

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

    private static final class InMemoryTokens implements PasswordResetTokenRepository {
        private final Map<UUID, PasswordResetToken> byId = new HashMap<>();

        @Override
        public PasswordResetToken save(PasswordResetToken token) {
            byId.put(token.id(), token);
            return token;
        }

        @Override
        public Optional<PasswordResetToken> findByTokenHash(String tokenHash) {
            return byId.values().stream().filter(t -> t.tokenHash().equals(tokenHash)).findFirst();
        }

        @Override
        public void deleteAllForUser(UUID userId) {
            byId.values().removeIf(t -> t.userId().equals(userId));
        }

        List<PasswordResetToken> all() {
            return List.copyOf(byId.values());
        }
    }

    private static final class RecordingSender implements ResetLinkSender {
        private final List<String> links = new ArrayList<>();
        private String lastEmail;

        @Override
        public void send(String email, String resetLink) {
            lastEmail = email;
            links.add(resetLink);
        }
    }

    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-07-23T10:00:00Z");

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
