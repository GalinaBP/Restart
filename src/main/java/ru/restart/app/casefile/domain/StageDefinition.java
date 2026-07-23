package ru.restart.app.casefile.domain;

import java.util.Objects;
import java.util.Optional;

/**
 * One stage as configured in {@code casefile/journey.yml} (backlog AI-018).
 *
 * @param branch {@code null} for a stage on the common path (shown whatever the court decides);
 *               otherwise the single procedure this stage belongs to.
 */
public record StageDefinition(JourneyStage key, int order, ProcedureType branch, boolean derived,
                              String statutoryBasis) {

    public StageDefinition {
        Objects.requireNonNull(key, "key");
        Objects.requireNonNull(statutoryBasis, "statutoryBasis");
    }

    /** A stage on the common path, shown regardless of the procedure the court chooses. */
    public boolean isCommon() {
        return branch == null;
    }

    /**
     * Whether this stage belongs to the journey of a case on the given procedure. Before the
     * court decides ({@code procedure} is empty) only the common path is visible — the app does
     * not show the steps of a procedure that may never apply.
     */
    public boolean appliesTo(Optional<ProcedureType> procedure) {
        return isCommon() || procedure.filter(branch::equals).isPresent();
    }
}
