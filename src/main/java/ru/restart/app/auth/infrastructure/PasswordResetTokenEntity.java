package ru.restart.app.auth.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import ru.restart.app.common.persistence.BaseEntity;

import java.time.Instant;
import java.util.UUID;

/** JPA mapping of {@code password_reset_token} (see {@code V6__create_password_reset_token.sql}). */
@Entity
@Table(name = "password_reset_token")
public class PasswordResetTokenEntity extends BaseEntity {

    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    protected PasswordResetTokenEntity() {
        // JPA
    }

    PasswordResetTokenEntity(UUID id, UUID userId, String tokenHash, Instant expiresAt,
                             Instant usedAt) {
        this.id = id;
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.usedAt = usedAt;
    }

    /** Replaced-in-place on save: markUsed persists over the same primary key. */
    void update(Instant usedAt) {
        this.usedAt = usedAt;
    }

    UUID getId() {
        return id;
    }

    UUID getUserId() {
        return userId;
    }

    String getTokenHash() {
        return tokenHash;
    }

    Instant getExpiresAt() {
        return expiresAt;
    }

    Instant getUsedAt() {
        return usedAt;
    }
}
