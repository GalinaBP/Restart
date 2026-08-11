package ru.restart.app.auth.infrastructure;

import ru.restart.app.auth.application.IssuedTokens;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInSeconds) {

    static TokenResponse from(IssuedTokens tokens) {
        return new TokenResponse(tokens.accessToken(), tokens.refreshToken(), "Bearer",
                tokens.accessTokenTtlSeconds());
    }
}
