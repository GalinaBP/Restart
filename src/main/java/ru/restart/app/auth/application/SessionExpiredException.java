package ru.restart.app.auth.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

/** The presented refresh token is invalid/expired, or the account behind a token no longer exists. */
public class SessionExpiredException extends BusinessException {

    public SessionExpiredException() {
        super(ErrorCode.AUTHENTICATION_FAILED, HttpStatus.UNAUTHORIZED,
                "Сессия истекла — войдите ещё раз");
    }
}
