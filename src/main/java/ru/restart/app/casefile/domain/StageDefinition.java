package ru.restart.app.casefile.domain;

import java.util.Objects;
import java.util.Optional;

public record StageDefinition(JourneyStage key, int order, ProcedureType branch, boolean derived,
                              String statutoryBasis) {

    public StageDefinition {
        Objects.requireNonNull(key, "key");
        Objects.requireNonNull(statutoryBasis, "statutoryBasis");
    }

    public boolean isCommon() {
        return branch == null;
    }

    public boolean appliesTo(Optional<ProcedureType> procedure) {
        return isCommon() || procedure.filter(branch::equals).isPresent();
    }
}
