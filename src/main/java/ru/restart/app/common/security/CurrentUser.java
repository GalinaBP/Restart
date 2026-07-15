package ru.restart.app.common.security;

import java.util.Optional;

/**
 * Abstraction over "who is calling", so application services can perform ownership checks without
 * touching Spring Security types directly. Makes services trivially unit-testable with a stub.
 */
public interface CurrentUser {

    /** The authenticated principal, or empty for anonymous/unauthenticated requests. */
    Optional<AuthenticatedUser> get();

    /** The authenticated principal, or throws if the request is not authenticated. */
    AuthenticatedUser require();
}
