package ru.restart.app.casefile.domain;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The bankruptcy case: container for all data a user collects on the way to filing, and — since
 * the journey epic (AI-018) — the anchor of where the case has got to in the court procedure.
 * Data sections (AI-002), generated documents (AI-006) and recorded stages (AI-018) all attach to
 * it, so a fresh case is, by construction, a case with everything still empty.
 */
public class BankruptcyCase {

    private final UUID id;
    private final UUID userId;
    private final CaseType type;
    private final CaseStatus status;
    /** Null until the court decides which procedure applies — never predicted by the app. */
    private final ProcedureType procedureType;

    public BankruptcyCase(UUID id, UUID userId, CaseType type, CaseStatus status,
                          ProcedureType procedureType) {
        this.id = Objects.requireNonNull(id, "id");
        this.userId = Objects.requireNonNull(userId, "userId");
        this.type = Objects.requireNonNull(type, "type");
        this.status = Objects.requireNonNull(status, "status");
        this.procedureType = procedureType;
    }

    /** Starts a new personal-bankruptcy case for the given user, in {@code DRAFT}. */
    public static BankruptcyCase startDraft(UUID userId) {
        return new BankruptcyCase(UUID.randomUUID(), userId, CaseType.PERSONAL_BANKRUPTCY,
                CaseStatus.DRAFT, null);
    }

    /** A case is active — and blocks starting another one — until it has been filed. */
    public boolean isActive() {
        return status != CaseStatus.FILED;
    }

    /** Saving the first piece of data moves a draft into {@code IN_PROGRESS}; otherwise a no-op. */
    public BankruptcyCase progressStarted() {
        if (status != CaseStatus.DRAFT) {
            return this;
        }
        return new BankruptcyCase(id, userId, type, CaseStatus.IN_PROGRESS, procedureType);
    }

    /**
     * Records the procedure the court chose, switching the journey to that branch (AI-024).
     * Correctable: the user may have recorded the wrong one, and {@code null} puts the case back
     * on the common path.
     */
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

    /** Empty until the court has decided — see {@link ProcedureType}. */
    public Optional<ProcedureType> procedureType() {
        return Optional.ofNullable(procedureType);
    }
}
