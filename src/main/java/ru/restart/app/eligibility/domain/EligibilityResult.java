package ru.restart.app.eligibility.domain;

import java.util.List;

/**
 * Decision plus the plain-Russian reasons behind it. Reasons are written for the end user
 * (no legal terminology — a product constitution non-negotiable) and are empty when the case fits.
 */
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

    /** Bankruptcy would not give this person what they came for — and a lawyer would not change it. */
    public static EligibilityResult notRecommended(List<String> reasons) {
        return new EligibilityResult(EligibilityDecision.NOT_RECOMMENDED, reasons);
    }

    /** Cannot cover the mandatory procedure costs — the court will not start without them. */
    public static EligibilityResult notReadyForCosts() {
        return new EligibilityResult(EligibilityDecision.NOT_READY_FOR_COSTS, List.of());
    }
}
