package ru.restart.app.casefile.domain;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public class BankruptcyCase {

    private final UUID id;
    private final UUID userId;
    private final CaseType type;
    private final CaseStatus status;
    private final ProcedureType procedureType;

    public BankruptcyCase(UUID id, UUID userId, CaseType type, CaseStatus status,
                          ProcedureType procedureType) {
        this.id = Objects.requireNonNull(id, "id");
        this.userId = Objects.requireNonNull(userId, "userId");
        this.type = Objects.requireNonNull(type, "type");
        this.status = Objects.requireNonNull(status, "status");
        this.procedureType = procedureType;
    }

    public static BankruptcyCase startDraft(UUID userId) {
        return new BankruptcyCase(UUID.randomUUID(), userId, CaseType.PERSONAL_BANKRUPTCY,
                CaseStatus.DRAFT, null);
    }

    public boolean isActive() {
        return status != CaseStatus.FILED;
    }

    public BankruptcyCase progressStarted() {
        if (status != CaseStatus.DRAFT) {
            return this;
        }
        return new BankruptcyCase(id, userId, type, CaseStatus.IN_PROGRESS, procedureType);
    }

    public BankruptcyCase withProcedureType(ProcedureType chosen) {
        return new BankruptcyCase(id, userId, type, status, chosen);
    }

    public boolean isOwnedBy(UUID candidate) {
        return userId.equals(candidate);
    }

    public UUID id() {
        return id;
    }

    public UUID userId() {
        return userId;
    }

    public CaseType type() {
        return type;
    }

    public CaseStatus status() {
        return status;
    }

    public Optional<ProcedureType> procedureType() {
        return Optional.ofNullable(procedureType);
    }
}
