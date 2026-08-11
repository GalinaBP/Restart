package ru.restart.app.auth.infrastructure;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "В ссылке не хватает кода — откройте её из письма ещё раз")
        String token,

        @NotBlank(message = "Придумайте пароль")
        @Size(min = 8, max = 72, message = "Пароль должен быть от 8 до 72 символов")
        String password) {
}
