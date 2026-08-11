package ru.restart.app.casefile.application;

import ru.restart.app.casefile.domain.JourneyStage;
import ru.restart.app.casefile.domain.ProcedureType;
import ru.restart.app.casefile.domain.StageStatus;

import java.time.LocalDate;

public record StageView(JourneyStage stage, int order, ProcedureType branch, StageStatus status,
                        LocalDate startedOn, LocalDate completedOn, String note, boolean current,
                        boolean editable, String statutoryBasis) {
}
