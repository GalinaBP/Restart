package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.application.JourneyView;

import java.util.List;

/**
 * The journey map of a case: every stage that applies, in order.
 *
 * @param procedureType null until the court has decided; only the common path is listed then.
 * @param currentStage  null once every stage is done.
 */
public record JourneyResponse(List<JourneyStageResponse> stages, String procedureType,
                              String currentStage) {

    static JourneyResponse from(JourneyView view) {
        return new JourneyResponse(
                view.stages().stream().map(JourneyStageResponse::from).toList(),
                view.procedureType().map(Enum::name).orElse(null),
                view.currentStage().map(Enum::name).orElse(null));
    }
}
