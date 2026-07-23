package ru.restart.app.casefile.domain;

import java.util.List;
import java.util.Optional;

/**
 * The configured procedure (backlog AI-018): which stages exist, in what order, and which branch
 * each belongs to. Implemented in the infrastructure layer over {@code casefile/journey.yml}.
 */
public interface JourneyRegistry {

    /** Every configured stage, ordered — including the branch-specific ones. */
    List<StageDefinition> all();

    /**
     * The stages that make up the journey of a case on the given procedure, in order: the common
     * path, plus the branch of the chosen procedure once the court has decided.
     */
    List<StageDefinition> forProcedure(Optional<ProcedureType> procedure);

    StageDefinition get(JourneyStage stage);
}
