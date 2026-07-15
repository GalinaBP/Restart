package ru.restart.app.auth.infrastructure;

import org.springframework.stereotype.Component;
import ru.restart.app.auth.domain.UserAccount;
import ru.restart.app.auth.domain.UserAccountRepository;

import java.util.Optional;
import java.util.UUID;

/** JPA-backed implementation of the domain's persistence port. */
@Component
class UserAccountRepositoryAdapter implements UserAccountRepository {

    private final UserAccountJpaRepository jpa;

    UserAccountRepositoryAdapter(UserAccountJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public UserAccount save(UserAccount account) {
        return toDomain(jpa.save(new UserAccountEntity(
                account.id(), account.email(), account.passwordHash(), account.role())));
    }

    @Override
    public Optional<UserAccount> findById(UUID id) {
        return jpa.findById(id).map(this::toDomain);
    }

    @Override
    public Optional<UserAccount> findByEmail(String email) {
        return jpa.findByEmail(email).map(this::toDomain);
    }

    @Override
    public boolean existsByEmail(String email) {
        return jpa.existsByEmail(email);
    }

    private UserAccount toDomain(UserAccountEntity entity) {
        return new UserAccount(entity.getId(), entity.getEmail(), entity.getPasswordHash(),
                entity.getRole());
    }
}
