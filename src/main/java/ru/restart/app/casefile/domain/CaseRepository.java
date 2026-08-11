package ru.restart.app.casefile.domain;

import java.util.Optional;
import java.util.UUID;

public interface CaseRepository {

    BankruptcyCase save(BankruptcyCase bankruptcyCase);

    Optional<BankruptcyCase> findById(UUID id);

    Optional<BankruptcyCase> findActiveByUserId(UUID userId);
}
