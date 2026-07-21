package ru.restart.app.auth.infrastructure;

import jakarta.validation.constraints.NotBlank;

/** Login body. No format checks beyond presence: any mismatch is answered uniformly with 401. */
public record LoginRequest(
        @NotBlank(message = "Укажите электронную почту") String email,
        @NotBlank(message = "Введите пароль") String password) {
}
