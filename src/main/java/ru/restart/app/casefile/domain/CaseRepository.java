package ru.restart.app.casefile.domain;

import java.util.Optional;
import java.util.UUID;

/** Persistence port for cases; implemented by the JPA adapter in infrastructure. */
public interface CaseRepository {

    BankruptcyCase save(BankruptcyCase bankruptcyCase);

    Optional<BankruptcyCase> findById(UUID id);

    /** The user's not-yet-filed case, if any. At most one exists — enforced at creation. */
    Optional<BankruptcyCase> findActiveByUserId(UUID userId);
}
