package ru.restart.app.auth.infrastructure;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Registration body. The password cap of 72 characters is the BCrypt input limit; messages are
 * plain Russian because field errors are shown to the user as-is.
 */
public record RegisterRequest(
        @NotBlank(message = "Укажите электронную почту")
        @Email(message = "Похоже, в адресе почты опечатка")
        @Size(max = 320, message = "Слишком длинный адрес почты")
        String email,

        @NotBlank(message = "Придумайте пароль")
        @Size(min = 8, max = 72, message = "Пароль должен быть от 8 до 72 символов")
        String password) {
}
