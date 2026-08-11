package ru.restart.app.auth.domain;

import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

public class UserAccount {

    private final UUID id;
    private final String email;
    private final String passwordHash;
    private final UserRole role;

    public UserAccount(UUID id, String email, String passwordHash, UserRole role) {
        this.id = Objects.requireNonNull(id, "id");
        this.email = normalizeEmail(email);
        this.passwordHash = Objects.requireNonNull(passwordHash, "passwordHash");
        this.role = Objects.requireNonNull(role, "role");
    }

    public static UserAccount register(String email, String passwordHash) {
        return new UserAccount(UUID.randomUUID(), email, passwordHash, UserRole.USER);
    }

    public static String normalizeEmail(String email) {
        return Objects.requireNonNull(email, "email").trim().toLowerCase(Locale.ROOT);
    }

    public UUID id() {
        return id;
    }

    public String email() {
        return email;
    }

    public String passwordHash() {
        return passwordHash;
    }

    public UserRole role() {
        return role;
    }
}
