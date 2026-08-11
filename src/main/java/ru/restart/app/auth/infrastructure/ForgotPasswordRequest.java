package ru.restart.app.auth.infrastructure;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @NotBlank(message = "Укажите электронную почту")
        @Email(message = "Похоже, в адресе почты опечатка")
        @Size(max = 320, message = "Слишком длинный адрес почты")
        String email) {
}
