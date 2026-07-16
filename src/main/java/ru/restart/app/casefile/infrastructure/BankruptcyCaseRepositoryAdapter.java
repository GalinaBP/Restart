package ru.restart.app.casefile.infrastructure;

import org.springframework.stereotype.Component;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.casefile.domain.CaseStatus;

import java.util.Optional;
import java.util.UUID;

/** JPA-backed implementation of the case persistence port. */
@Component
class BankruptcyCaseRepositoryAdapter implements CaseRepository {

    private final BankruptcyCaseJpaRepository jpa;

    BankruptcyCaseRepositoryAdapter(BankruptcyCaseJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public BankruptcyCase save(BankruptcyCase bankruptcyCase) {
        return toDomain(jpa.save(new BankruptcyCaseEntity(bankruptcyCase.id(),
                bankruptcyCase.userId(), bankruptcyCase.type(), bankruptcyCase.status())));
    }

    @Override
    public Optional<BankruptcyCase> findById(UUID id) {
        return jpa.findById(id).map(this::toDomain);
    }

    @Override
    public Optional<BankruptcyCase> findActiveByUserId(UUID userId) {
        return jpa.findFirstByUserIdAndStatusNot(userId, CaseStatus.FILED).map(this::toDomain);
    }

    private BankruptcyCase toDomain(BankruptcyCaseEntity entity) {
        return new BankruptcyCase(entity.getId(), entity.getUserId(), entity.getCaseType(),
                entity.getStatus());
    }
}
