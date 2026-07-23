package ru.restart.app.casefile.application;

import ru.restart.app.casefile.domain.JourneyStage;
import ru.restart.app.casefile.domain.ProcedureType;

import java.util.List;
import java.util.Optional;

/**
 * The whole journey of one case (backlog AI-018): every stage that applies, in order, with the
 * current one marked. {@code procedureType} is empty until the court has decided, in which case
 * only the common path is listed.
 *
 * @param currentStage empty once every stage is done — the case is finished.
 */
public record JourneyView(List<StageView> stages, Optional<ProcedureType> procedureType,
                          Optional<JourneyStage> currentStage) {
}
