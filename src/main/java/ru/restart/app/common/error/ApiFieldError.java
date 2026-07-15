package ru.restart.app.common.error;

/**
 * A single field-level validation error, as returned inside {@link ApiError#fieldErrors()}.
 */
public record ApiFieldError(String field, String message) {
}
