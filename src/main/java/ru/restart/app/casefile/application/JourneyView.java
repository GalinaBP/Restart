package ru.restart.app.casefile.application;

import ru.restart.app.casefile.domain.JourneyStage;
import ru.restart.app.casefile.domain.ProcedureType;

import java.util.List;
import java.util.Optional;

public record JourneyView(List<StageView> stages, Optional<ProcedureType> procedureType,
                          Optional<JourneyStage> currentStage) {
}
