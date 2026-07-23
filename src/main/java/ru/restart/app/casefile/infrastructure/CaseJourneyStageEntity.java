package ru.restart.app.casefile.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import ru.restart.app.casefile.domain.JourneyStage;
import ru.restart.app.casefile.domain.StageStatus;
import ru.restart.app.common.persistence.BaseEntity;

import java.time.LocalDate;
import java.util.UUID;

/** JPA mapping of {@code case_journey_stage} (see {@code V8__create_case_journey_stage.sql}). */
@Entity
@Table(name = "case_journey_stage")
public class CaseJourneyStageEntity extends BaseEntity {

    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "case_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID caseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false, length = 64)
    private JourneyStage stage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private StageStatus status;

    @Column(name = "started_on")
    private LocalDate startedOn;

    @Column(name = "completed_on")
    private LocalDate completedOn;

    @Column(name = "note", length = 2000)
    private String note;

    protected CaseJourneyStageEntity() {
        // JPA
    }

    CaseJourneyStageEntity(UUID id, UUID caseId, JourneyStage stage, StageStatus status,
                           LocalDate startedOn, LocalDate completedOn, String note) {
        this.id = id;
        this.caseId = caseId;
        this.stage = stage;
        this.status = status;
        this.startedOn = startedOn;
        this.completedOn = completedOn;
        this.note = note;
    }

    /** Re-recording a stage replaces the progress in place, under the same primary key. */
    void update(StageStatus newStatus, LocalDate newStartedOn, LocalDate newCompletedOn,
                String newNote) {
        this.status = newStatus;
        this.startedOn = newStartedOn;
        this.completedOn = newCompletedOn;
        this.note = newNote;
    }

    UUID getId() {
        return id;
    }

    UUID getCaseId() {
        return caseId;
    }

    JourneyStage getStage() {
        return stage;
    }

    StageStatus getStatus() {
        return status;
    }

    LocalDate getStartedOn() {
        return startedOn;
    }

    LocalDate getCompletedOn() {
        return completedOn;
    }

    String getNote() {
        return note;
    }
}
