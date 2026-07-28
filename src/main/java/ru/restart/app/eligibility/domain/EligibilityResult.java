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

    /** Debt too small for a court bankruptcy to be worthwhile — Restart is not the right tool. */
    public static EligibilityResult debtTooSmall() {
        return new EligibilityResult(EligibilityDecision.DEBT_TOO_SMALL, List.of());
    }
}
