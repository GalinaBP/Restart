package ru.restart.app.casefile.domain;

import java.util.List;
import java.util.Optional;

public interface JourneyRegistry {

    List<StageDefinition> all();

    List<StageDefinition> forProcedure(Optional<ProcedureType> procedure);

    StageDefinition get(JourneyStage stage);
}
