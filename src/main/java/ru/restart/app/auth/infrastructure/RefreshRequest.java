package ru.restart.app.auth.infrastructure;

import jakarta.validation.constraints.NotBlank;

/** Refresh body: the refresh token previously issued at register/login/refresh. */
public record RefreshRequest(
        @NotBlank(message = "Не передан токен обновления") String refreshToken) {
}
