package ru.restart.app.auth.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

/** Registration attempted with an email that already has an account. */
public class EmailAlreadyRegisteredException extends BusinessException {

    public EmailAlreadyRegisteredException() {
        super(ErrorCode.EMAIL_ALREADY_REGISTERED, HttpStatus.CONFLICT,
                "Эта почта уже зарегистрирована. Попробуй войти");
    }
}
