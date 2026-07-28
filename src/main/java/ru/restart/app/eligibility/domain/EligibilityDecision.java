package ru.restart.app.eligibility.domain;

/** Outcome of the eligibility check. */
public enum EligibilityDecision {
    /** The case looks simple enough for guided self-service. */
    SELF_SERVICE_OK,
    /** The case has complexity markers; per the constitution we honestly route to a lawyer. */
    NEEDS_LAWYER,
    /**
     * The debt is so small that a court bankruptcy is usually not worthwhile. Restart is not the
     * right tool — but this is honestly <em>not</em> a "needs a lawyer" case.
     */
    DEBT_TOO_SMALL,
    /**
     * The person cannot cover the mandatory procedure costs (court deposit, publications,
     * postage). The court will not start without them, and a lawyer would only cost more —
     * so this is an honest "come back later", not a lawyer referral.
     */
    NOT_READY_FOR_COSTS
}
