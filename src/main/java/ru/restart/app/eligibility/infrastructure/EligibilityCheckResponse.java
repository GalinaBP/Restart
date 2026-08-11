package ru.restart.app.eligibility.infrastructure;

import ru.restart.app.eligibility.domain.EligibilityDecision;
import ru.restart.app.eligibility.domain.EligibilityResult;

import java.util.List;

public record EligibilityCheckResponse(EligibilityDecision decision, List<String> reasons) {

    static EligibilityCheckResponse from(EligibilityResult result) {
        return new EligibilityCheckResponse(result.decision(), result.reasons());
    }
}
