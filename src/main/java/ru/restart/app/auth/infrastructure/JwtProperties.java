package ru.restart.app.auth.infrastructure;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * JWT settings under {@code app.security.jwt} (see application.yml; secrets come from the
 * environment). Access and refresh tokens use <em>different</em> secrets so one can never be
 * presented in place of the other.
 */
@ConfigurationProperties(prefix = "app.security.jwt")
public record JwtProperties(
        String accessSecret,
        String refreshSecret,
        Duration accessTokenTtl,
        Duration refreshTokenTtl) {
}
