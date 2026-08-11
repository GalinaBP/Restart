package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.BankruptcyCase;

import java.util.UUID;

public record CaseResponse(UUID id, String caseType, String status) {

    static CaseResponse from(BankruptcyCase bankruptcyCase) {
        return new CaseResponse(bankruptcyCase.id(), bankruptcyCase.type().name(),
                bankruptcyCase.status().name());
    }
}
