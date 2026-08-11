package ru.restart.app.eligibility.domain;

import java.util.List;

public record EligibilityResult(EligibilityDecision decision, List<String> reasons) {

    public EligibilityResult {
        reasons = List.copyOf(reasons);
    }

    public static EligibilityResult fits() {
        return new EligibilityResult(EligibilityDecision.SELF_SERVICE_OK, List.of());
    }

    public static EligibilityResult needsLawyer(List<String> reasons) {
        return new EligibilityResult(EligibilityDecision.NEEDS_LAWYER, reasons);
    }

    public static EligibilityResult notRecommended(List<String> reasons) {
        return new EligibilityResult(EligibilityDecision.NOT_RECOMMENDED, reasons);
    }

    public static EligibilityResult notReadyForCosts() {
        return new EligibilityResult(EligibilityDecision.NOT_READY_FOR_COSTS, List.of());
    }
}
