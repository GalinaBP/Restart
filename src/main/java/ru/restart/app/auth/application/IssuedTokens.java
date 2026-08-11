package ru.restart.app.auth.application;

public record IssuedTokens(String accessToken, String refreshToken, long accessTokenTtlSeconds) {
}
