package ru.restart.app.auth.application;

/**
 * A freshly issued token pair. {@code accessTokenTtlSeconds} is echoed to clients so they can
 * schedule refresh without decoding the JWT.
 */
public record IssuedTokens(String accessToken, String refreshToken, long accessTokenTtlSeconds) {
}
