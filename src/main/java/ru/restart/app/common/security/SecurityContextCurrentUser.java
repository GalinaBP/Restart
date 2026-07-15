package ru.restart.app.common.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Default {@link CurrentUser} backed by the Spring Security context. Expects the authentication
 * principal to be an {@link AuthenticatedUser}, as populated by the authentication filter.
 */
@Component
public class SecurityContextCurrentUser implements CurrentUser {

    @Override
    public Optional<AuthenticatedUser> get() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        if (authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return Optional.of(user);
        }
        return Optional.empty();
    }

    @Override
    public AuthenticatedUser require() {
        return get().orElseThrow(() ->
                new org.springframework.security.authentication.AuthenticationCredentialsNotFoundException(
                        "No authenticated user in the security context"));
    }
}
