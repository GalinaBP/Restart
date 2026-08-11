package ru.restart.app.auth.infrastructure;

import org.junit.jupiter.api.Test;
import ru.restart.app.auth.application.IssuedTokens;
import ru.restart.app.auth.domain.UserAccount;
import ru.restart.app.auth.domain.UserRole;
import ru.restart.app.common.security.AuthenticatedUser;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

class JwtTokenServiceTest {

    private static final String ACCESS_SECRET = "test-access-secret-0123456789-0123456789-0123456789";
    private static final String REFRESH_SECRET = "test-refresh-secret-0123456789-0123456789-0123456789";
    private static final Instant NOW = Instant.parse("2026-07-15T12:00:00Z");

    private final UserAccount account = new UserAccount(
            UUID.randomUUID(), "user@example.com", "{noop}irrelevant", UserRole.USER);

    private static JwtTokenService serviceAt(Instant instant) {
        JwtProperties properties = new JwtProperties(ACCESS_SECRET, REFRESH_SECRET,
                Duration.ofMinutes(15), Duration.ofDays(30));
        return new JwtTokenService(properties, Clock.fixed(instant, ZoneOffset.UTC));
    }

    @Test
    void accessTokenRoundTripsThePrincipal() {
        JwtTokenService service = serviceAt(NOW);
        IssuedTokens tokens = service.issue(account);

        assertThat(tokens.accessTokenTtlSeconds()).isEqualTo(Duration.ofMinutes(15).toSeconds());
        assertThat(service.parseAccessToken(tokens.accessToken()))
                .hasValue(new AuthenticatedUser(account.id(), "user@example.com", "ROLE_USER"));
    }

    @Test
    void refreshTokenRoundTripsTheAccountId() {
        JwtTokenService service = serviceAt(NOW);
        IssuedTokens tokens = service.issue(account);

        assertThat(service.parseRefreshToken(tokens.refreshToken())).hasValue(account.id());
    }

    @Test
    void tokenKindsAreNotInterchangeable() {
        JwtTokenService service = serviceAt(NOW);
        IssuedTokens tokens = service.issue(account);

        assertThat(service.parseAccessToken(tokens.refreshToken())).isEmpty();
        assertThat(service.parseRefreshToken(tokens.accessToken())).isEmpty();
    }

    @Test
    void expiredAccessTokenIsRejected() {
        IssuedTokens tokens = serviceAt(NOW).issue(account);
        JwtTokenService later = serviceAt(NOW.plus(Duration.ofMinutes(16)));

        assertThat(later.parseAccessToken(tokens.accessToken())).isEmpty();
        assertThat(later.parseRefreshToken(tokens.refreshToken())).hasValue(account.id());
    }

    @Test
    void garbageAndTamperedTokensAreRejected() {
        JwtTokenService service = serviceAt(NOW);
        String[] parts = service.issue(account).accessToken().split("\\.");
        String tampered = parts[0] + ".A" + parts[1] + "." + parts[2];

        assertThat(service.parseAccessToken("not-a-jwt")).isEmpty();
        assertThat(service.parseAccessToken(tampered)).isEmpty();
    }

    @Test
    void missingOrShortSecretFailsFast() {
        JwtProperties missing = new JwtProperties("", REFRESH_SECRET,
                Duration.ofMinutes(15), Duration.ofDays(30));
        JwtProperties tooShort = new JwtProperties(ACCESS_SECRET, "short",
                Duration.ofMinutes(15), Duration.ofDays(30));
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);

        assertThatIllegalStateException().isThrownBy(() -> new JwtTokenService(missing, clock))
                .withMessageContaining("access-secret");
        assertThatIllegalStateException().isThrownBy(() -> new JwtTokenService(tooShort, clock))
                .withMessageContaining("refresh-secret");
    }
}
