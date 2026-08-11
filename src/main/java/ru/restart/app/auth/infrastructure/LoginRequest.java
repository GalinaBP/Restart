package ru.restart.app.auth.infrastructure;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Укажите электронную почту") String email,
        @NotBlank(message = "Введите пароль") String password) {
}
