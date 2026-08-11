package ru.restart.app.auth.domain;

public enum UserRole {
    USER,
    ADMIN;

    public String authority() {
        return "ROLE_" + name();
    }

    public static UserRole fromAuthority(String authority) {
        if (authority == null || !authority.startsWith("ROLE_")) {
            throw new IllegalArgumentException("Not a role authority: " + authority);
        }
        return valueOf(authority.substring("ROLE_".length()));
    }
}
