package ru.restart.app.auth.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

public class InvalidCredentialsException extends BusinessException {

    public InvalidCredentialsException() {
        super(ErrorCode.AUTHENTICATION_FAILED, HttpStatus.UNAUTHORIZED,
                "Неверная почта или пароль");
    }
}
