package ru.restart.app.casefile.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

public class InvalidSectionPayloadException extends BusinessException {

    public InvalidSectionPayloadException(String message) {
        super(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, message);
    }
}
