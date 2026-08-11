package ru.restart.app.auth.infrastructure;

import org.springframework.stereotype.Component;
import ru.restart.app.auth.domain.PasswordResetToken;
import ru.restart.app.auth.domain.PasswordResetTokenRepository;

import java.util.Optional;
import java.util.UUID;

@Component
class PasswordResetTokenRepositoryAdapter implements PasswordResetTokenRepository {

    private final PasswordResetTokenJpaRepository jpa;

    PasswordResetTokenRepositoryAdapter(PasswordResetTokenJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public PasswordResetToken save(PasswordResetToken token) {
        PasswordResetTokenEntity entity = jpa.findById(token.id())
                .map(existing -> {
                    existing.update(token.usedAt());
                    return existing;
                })
                .orElseGet(() -> new PasswordResetTokenEntity(token.id(), token.userId(),
                        token.tokenHash(), token.expiresAt(), token.usedAt()));
        return toDomain(jpa.save(entity));
    }

    @Override
    public Optional<PasswordResetToken> findByTokenHash(String tokenHash) {
        return jpa.findByTokenHash(tokenHash).map(this::toDomain);
    }

    @Override
    public void deleteAllForUser(UUID userId) {
        jpa.deleteByUserId(userId);
    }

    private PasswordResetToken toDomain(PasswordResetTokenEntity entity) {
        return new PasswordResetToken(entity.getId(), entity.getUserId(), entity.getTokenHash(),
                entity.getExpiresAt(), entity.getUsedAt());
    }
}
