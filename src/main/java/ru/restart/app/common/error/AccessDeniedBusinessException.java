package ru.restart.app.common.error;

import org.springframework.http.HttpStatus;

public class AccessDeniedBusinessException extends BusinessException {

    public AccessDeniedBusinessException(String message) {
        super(ErrorCode.ACCESS_DENIED, HttpStatus.FORBIDDEN, message);
    }
}
