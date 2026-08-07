package ru.restart.app.eligibility.domain;

/**
 * Coarse debt-size buckets. Ranges instead of exact amounts: the user answers in one tap and no
 * financial data is collected at this stage.
 *
 * <p>The size of the debt <strong>never decides the outcome on its own</strong>. It says nothing
 * about whether a person can carry the procedure themselves, which is the only thing this check
 * tries to find out. PLACEHOLDER pending lawyer review.
 */
public enum DebtRange {
    UNDER_500K,
    FROM_500K_TO_1M,
    FROM_1M_TO_3M,
    OVER_3M,
    UNKNOWN
}
