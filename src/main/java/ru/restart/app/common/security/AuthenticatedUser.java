package ru.restart.app.common.security;

import java.util.UUID;

/**
 * Minimal, module-neutral view of the authenticated principal that any module may consume without
 * depending on the {@code auth} module's internals. Populated into the security context by the
 * authentication filter and never contains credentials or tokens.
 *
 * @param userId the stable identifier of the authenticated user
 * @param email  the user's email (login)
 * @param role   the single Spring Security authority name, e.g. {@code ROLE_USER}
 */
public record AuthenticatedUser(UUID userId, String email, String role) {
}
