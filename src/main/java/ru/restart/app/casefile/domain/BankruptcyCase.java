package ru.restart.app.casefile.domain;

import java.util.Objects;
import java.util.UUID;

/**
 * The bankruptcy case: container for all data a user collects on the way to filing. Owns nothing
 * else yet — data sections (AI-002) and generated documents (AI-006) attach to it in later tasks,
 * so a fresh case is, by construction, a case with every section still empty.
 */
public class BankruptcyCase {

    private final UUID id;
    private final UUID userId;
    private final CaseType type;
    private final CaseStatus status;

    public BankruptcyCase(UUID id, UUID userId, CaseType type, CaseStatus status) {
        this.id = Objects.requireNonNull(id, "id");
        this.userId = Objects.requireNonNull(userId, "userId");
        this.type = Objects.requireNonNull(type, "type");
        this.status = Objects.requireNonNull(status, "status");
    }

    /** Starts a new personal-bankruptcy case for the given user, in {@code DRAFT}. */
    public static BankruptcyCase startDraft(UUID userId) {
        return new BankruptcyCase(UUID.randomUUID(), userId, CaseType.PERSONAL_BANKRUPTCY,
                CaseStatus.DRAFT);
    }

    /** A case is active — and blocks starting another one — until it has been filed. */
    public boolean isActive() {
        return status != CaseStatus.FILED;
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
}
