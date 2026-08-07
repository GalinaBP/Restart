package ru.restart.app.eligibility.domain;

/**
 * Obligations and situations that change what bankruptcy can do. Some of them need a lawyer;
 * others mean the procedure will not give the person what they came for.
 * PLACEHOLDER pending lawyer review.
 */
public enum SpecialCircumstance {
    NONE,
    ALIMONY_DEBT,
    LIFE_HEALTH_HARM_DEBT,
    ECONOMIC_CRIMINAL_CASE,
    /** Guarantor on somebody else's loan. */
    GUARANTOR,
    OTHER_UNUSUAL
}
