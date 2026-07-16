package ru.restart.app.casefile.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.restart.app.casefile.domain.CaseStatus;

import java.util.Optional;
import java.util.UUID;

interface BankruptcyCaseJpaRepository extends JpaRepository<BankruptcyCaseEntity, UUID> {

    Optional<BankruptcyCaseEntity> findFirstByUserIdAndStatusNot(UUID userId, CaseStatus status);
}
