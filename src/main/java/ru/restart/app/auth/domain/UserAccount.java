package ru.restart.app.auth.domain;

import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/**
 * A registered account. Deliberately minimal: profile data needed for the bankruptcy case (passport,
 * income, …) belongs to the future case-management module, not here. Holds only the password
 * <em>hash</em> — plaintext passwords never reach the domain.
 */
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

    /** Registers a new regular user with a fresh identity. */
    public static UserAccount register(String email, String passwordHash) {
        return new UserAccount(UUID.randomUUID(), email, passwordHash, UserRole.USER);
    }

    /**
     * Canonical form used for storage and lookups, so {@code User@Mail.ru } and {@code user@mail.ru}
     * are the same account.
     */
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
