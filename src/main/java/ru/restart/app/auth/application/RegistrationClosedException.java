package ru.restart.app.auth.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

public class RegistrationClosedException extends BusinessException {

    public RegistrationClosedException() {
        super(ErrorCode.REGISTRATION_CLOSED, HttpStatus.FORBIDDEN,
                "Регистрация пока закрыта — мы откроемся совсем скоро");
    }
}
