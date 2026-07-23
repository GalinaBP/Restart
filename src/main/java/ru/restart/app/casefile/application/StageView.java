package ru.restart.app.casefile.application;

import ru.restart.app.casefile.domain.JourneyStage;
import ru.restart.app.casefile.domain.ProcedureType;
import ru.restart.app.casefile.domain.StageStatus;

import java.time.LocalDate;

/**
 * One stage as the journey map shows it (backlog AI-018): the configured stage plus whatever the
 * case has recorded — or, for a derived stage, whatever the case data implies.
 *
 * @param current  the stage the user should be working on now: the first that is not yet done.
 * @param editable false for a derived stage, whose status is computed and cannot be recorded.
 */
public record StageView(JourneyStage stage, int order, ProcedureType branch, StageStatus status,
                        LocalDate startedOn, LocalDate completedOn, String note, boolean current,
                        boolean editable, String statutoryBasis) {
}
