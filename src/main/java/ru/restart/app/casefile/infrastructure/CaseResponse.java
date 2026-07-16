package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.BankruptcyCase;

import java.util.UUID;

/** A case as the client sees it. */
public record CaseResponse(UUID id, String caseType, String status) {

    static CaseResponse from(BankruptcyCase bankruptcyCase) {
        return new CaseResponse(bankruptcyCase.id(), bankruptcyCase.type().name(),
                bankruptcyCase.status().name());
    }
}
