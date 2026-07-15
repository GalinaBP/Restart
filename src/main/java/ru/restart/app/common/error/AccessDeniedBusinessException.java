package ru.restart.app.common.error;

import org.springframework.http.HttpStatus;

/**
 * Thrown by application services when a caller is authenticated but not permitted to act on a
 * specific resource (e.g. ownership checks). Distinct from Spring Security's URL-level denial.
 */
public class AccessDeniedBusinessException extends BusinessException {

    public AccessDeniedBusinessException(String message) {
        super(ErrorCode.ACCESS_DENIED, HttpStatus.FORBIDDEN, message);
    }
}
