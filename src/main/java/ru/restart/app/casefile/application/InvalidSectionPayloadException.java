package ru.restart.app.casefile.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

/**
 * The submitted section payload has the wrong shape or contains fields the section does not
 * define. Value-level validation (formats, checksums, required fields) is the validation engine's
 * job (backlog AI-003) — this guard only keeps unknown data out of the case.
 */
public class InvalidSectionPayloadException extends BusinessException {

    public InvalidSectionPayloadException(String message) {
        super(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, message);
    }
}
