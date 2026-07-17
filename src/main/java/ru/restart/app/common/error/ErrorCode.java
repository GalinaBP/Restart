package ru.restart.app.common.error;

/**
 * Stable, client-facing error codes. These are part of the API contract and must not leak
 * framework or database details. Add new values here rather than inventing ad-hoc strings.
 */
public enum ErrorCode {
    VALIDATION_ERROR,
    RESOURCE_NOT_FOUND,
    ACCESS_DENIED,
    INVALID_STATE,
    AUTHENTICATION_FAILED,
    EMAIL_ALREADY_REGISTERED,
    GENERATION_BLOCKED,
    METHOD_NOT_ALLOWED,
    UNSUPPORTED_MEDIA_TYPE,
    INTERNAL_ERROR
}
