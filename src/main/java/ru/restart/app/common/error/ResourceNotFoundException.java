package ru.restart.app.common.error;

import org.springframework.http.HttpStatus;

/** Thrown when a requested aggregate/entity does not exist (or is not visible to the caller). */
public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(String message) {
        super(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, message);
    }

    public static ResourceNotFoundException of(String resource, Object id) {
        return new ResourceNotFoundException(resource + " not found: " + id);
    }
}
