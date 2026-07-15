package ru.restart.app.common.error;

import org.springframework.http.HttpStatus;

/**
 * Base type for domain/application-level failures that map to a deterministic HTTP response.
 * Business modules throw subclasses of this; the {@link GlobalExceptionHandler} translates them
 * into an {@link ApiError} without exposing framework internals.
 */
public abstract class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;
    private final HttpStatus status;

    protected BusinessException(ErrorCode errorCode, HttpStatus status, String message) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
    }

    public ErrorCode errorCode() {
        return errorCode;
    }

    public HttpStatus status() {
        return status;
    }
}
