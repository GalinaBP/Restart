package ru.restart.app.casefile.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

public class CaseJourneyStage {

    private final UUID id;
    private final UUID caseId;
    private final JourneyStage stage;
    private final StageStatus status;
    private final LocalDate startedOn;
    private final LocalDate completedOn;
    private final String note;
    private final Instant updatedAt;

    public CaseJourneyStage(UUID id, UUID caseId, JourneyStage stage, StageStatus status,
                            LocalDate startedOn, LocalDate completedOn, String note,
                            Instant updatedAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.caseId = Objects.requireNonNull(caseId, "caseId");
        this.stage = Objects.requireNonNull(stage, "stage");
        this.status = Objects.requireNonNull(status, "status");
        this.startedOn = startedOn;
        this.completedOn = completedOn;
        this.note = note;
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
    }

    public static CaseJourneyStage record(UUID caseId, JourneyStage stage, StageStatus status,
                                          LocalDate startedOn, LocalDate completedOn, String note,
                                          Instant now) {
        return new CaseJourneyStage(UUID.randomUUID(), caseId, stage, status, startedOn,
                completedOn, note, now);
    }

    public CaseJourneyStage updatedTo(StageStatus newStatus, LocalDate newStartedOn,
                                      LocalDate newCompletedOn, String newNote, Instant now) {
        return new CaseJourneyStage(id, caseId, stage, newStatus, newStartedOn, newCompletedOn,
                newNote, now);
    }

    public UUID id() {
        return id;
    }

    public UUID caseId() {
        return caseId;
    }

    public JourneyStage stage() {
        return stage;
    }

    public StageStatus status() {
        return status;
    }

    public LocalDate startedOn() {
        return startedOn;
    }

    public LocalDate completedOn() {
        return completedOn;
    }

    public String note() {
        return note;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
