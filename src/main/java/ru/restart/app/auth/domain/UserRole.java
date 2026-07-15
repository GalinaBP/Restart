package ru.restart.app.auth.domain;

/**
 * Role of an account. Kept as a domain enum; the corresponding Spring Security authority names are
 * shared platform-wide via {@code common.security.Authorities}.
 */
public enum UserRole {
    USER,
    ADMIN;

    /** The Spring Security authority name for this role, e.g. {@code ROLE_USER}. */
    public String authority() {
        return "ROLE_" + name();
    }

    /** Inverse of {@link #authority()}; rejects unknown names so bad data fails fast. */
    public static UserRole fromAuthority(String authority) {
        if (authority == null || !authority.startsWith("ROLE_")) {
            throw new IllegalArgumentException("Not a role authority: " + authority);
        }
        return valueOf(authority.substring("ROLE_".length()));
    }
}
