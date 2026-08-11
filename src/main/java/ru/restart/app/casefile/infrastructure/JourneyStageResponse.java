package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.application.StageView;

import java.time.LocalDate;

public record JourneyStageResponse(String stage, int order, String branch, String status,
                                   LocalDate startedOn, LocalDate completedOn, String note,
                                   boolean current, boolean editable, String statutoryBasis) {

    static JourneyStageResponse from(StageView view) {
        return new JourneyStageResponse(view.stage().name(), view.order(),
                view.branch() == null ? null : view.branch().name(),
                view.status().name(), view.startedOn(), view.completedOn(), view.note(),
                view.current(), view.editable(), view.statutoryBasis());
    }
}
