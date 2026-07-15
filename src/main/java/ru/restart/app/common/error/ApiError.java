package ru.restart.app.common.error;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

/**
 * Uniform error payload returned by every endpoint on failure. Serialised to the shape documented
 * in {@code docs/api.md}. {@code fieldErrors} is omitted entirely when there are none.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiError(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        String correlationId,
        List<ApiFieldError> fieldErrors
) {

    public static ApiError of(int status, ErrorCode code, String message, String path, String correlationId) {
        return new ApiError(Instant.now(), status, code.name(), message, path, correlationId, List.of());
    }

    public static ApiError of(int status, ErrorCode code, String message, String path, String correlationId,
                              List<ApiFieldError> fieldErrors) {
        return new ApiError(Instant.now(), status, code.name(), message, path, correlationId, fieldErrors);
    }
}
