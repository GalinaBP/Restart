package ru.restart.app.auth.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

/**
 * Sign-ups are switched off ({@code restart.registration.enabled=false}, env
 * {@code REGISTRATION_ENABLED}) — the private-beta mode: existing accounts keep working, new ones
 * cannot be created, not even by calling the API directly.
 */
public class RegistrationClosedException extends BusinessException {

    public RegistrationClosedException() {
        super(ErrorCode.REGISTRATION_CLOSED, HttpStatus.FORBIDDEN,
                "Регистрация пока закрыта — мы откроемся совсем скоро");
    }
}
