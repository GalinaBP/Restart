package ru.restart.app.auth.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import ru.restart.app.auth.domain.UserRole;
import ru.restart.app.common.persistence.BaseEntity;

import java.util.UUID;

/**
 * JPA mapping of {@code user_account} (see {@code V1__create_user_account.sql}). UUIDs follow the
 * platform convention of {@code BINARY(16)} storage; Hibernate's binary UUID encoding matches
 * {@code common.persistence.UuidUtils} (most-significant bits first).
 */
@Entity
@Table(name = "user_account")
public class UserAccountEntity extends BaseEntity {

    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "email", nullable = false, length = 320)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 32)
    private UserRole role;

    protected UserAccountEntity() {
        // JPA
    }

    UserAccountEntity(UUID id, String email, String passwordHash, UserRole role) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    UUID getId() {
        return id;
    }

    String getEmail() {
        return email;
    }

    String getPasswordHash() {
        return passwordHash;
    }

    UserRole getRole() {
        return role;
    }
}
