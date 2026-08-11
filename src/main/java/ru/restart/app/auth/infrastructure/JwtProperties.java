package ru.restart.app.auth.infrastructure;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.security.jwt")
public record JwtProperties(
        String accessSecret,
        String refreshSecret,
        Duration accessTokenTtl,
        Duration refreshTokenTtl) {
}
