package ru.restart.app.auth.domain;

import java.util.Optional;
import java.util.UUID;

/**
 * Persistence port for accounts. Implemented in the infrastructure layer (JPA adapter); the domain
 * and application layers stay free of persistence technology.
 */
public interface UserAccountRepository {

    UserAccount save(UserAccount account);

    Optional<UserAccount> findById(UUID id);

    /** Expects the email in canonical form — see {@link UserAccount#normalizeEmail(String)}. */
    Optional<UserAccount> findByEmail(String email);

    boolean existsByEmail(String email);
}
