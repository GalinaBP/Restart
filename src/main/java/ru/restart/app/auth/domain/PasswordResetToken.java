package ru.restart.app.auth.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * A single-use, time-limited permission to set a new password. Holds only the SHA-256 of the token
 * that was mailed out — the raw value exists solely in the reset link, so a leaked database row
 * cannot be replayed. Immutable like {@link UserAccount}; consuming the token yields a used copy.
 */
public class PasswordResetToken {

    private final UUID id;
    private final UUID userId;
    private final String tokenHash;
    private final Instant expiresAt;
    private final Instant usedAt;

    public PasswordResetToken(UUID id, UUID userId, String tokenHash, Instant expiresAt,
                              Instant usedAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.userId = Objects.requireNonNull(userId, "userId");
        this.tokenHash = Objects.requireNonNull(tokenHash, "tokenHash");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
        this.usedAt = usedAt;
    }

    /** Issues a fresh, unused token for the account. */
    public static PasswordResetToken issue(UUID userId, String tokenHash, Instant expiresAt) {
        return new PasswordResetToken(UUID.randomUUID(), userId, tokenHash, expiresAt, null);
    }

    /** Usable = never consumed and not yet expired. Both failures look identical to the caller. */
    public boolean isUsable(Instant now) {
        return usedAt == null && now.isBefore(expiresAt);
    }

    /** The consumed form of this token; persisting it retires the reset link permanently. */
    public PasswordResetToken markUsed(Instant now) {
        return new PasswordResetToken(id, userId, tokenHash, expiresAt,
                Objects.requireNonNull(now, "now"));
    }

    public UUID id() {
        return id;
    }

    public UUID userId() {
        return userId;
    }

    public String tokenHash() {
        return tokenHash;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public Instant usedAt() {
        return usedAt;
    }
}
