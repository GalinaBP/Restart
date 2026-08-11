package ru.restart.app.auth.infrastructure;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(
        @NotBlank(message = "Не передан токен обновления") String refreshToken) {
}
