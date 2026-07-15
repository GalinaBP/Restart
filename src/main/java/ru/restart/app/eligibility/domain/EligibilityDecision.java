package ru.restart.app.eligibility.domain;

/** Outcome of the eligibility check. */
public enum EligibilityDecision {
    /** The case looks simple enough for guided self-service. */
    SELF_SERVICE_OK,
    /** The case has complexity markers; per the constitution we honestly route to a lawyer. */
    NEEDS_LAWYER
}
