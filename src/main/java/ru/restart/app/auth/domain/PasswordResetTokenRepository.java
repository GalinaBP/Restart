package ru.restart.app.auth.domain;

import java.util.Optional;
import java.util.UUID;

/**
 * Persistence port for reset tokens. Lookup is by token <em>hash</em> only — the raw token never
 * reaches a query.
 */
public interface PasswordResetTokenRepository {

    PasswordResetToken save(PasswordResetToken token);

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** Retires every token of the account; a new request supersedes all earlier links. */
    void deleteAllForUser(UUID userId);
}
