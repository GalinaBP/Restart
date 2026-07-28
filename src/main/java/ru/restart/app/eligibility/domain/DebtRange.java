package ru.restart.app.eligibility.domain;

/**
 * Coarse debt-size buckets around the product's 350k–3M ₽ focus (see the constitution). Ranges
 * instead of exact amounts: the user answers in one tap and no financial data is collected at
 * this stage.
 */
public enum DebtRange {
    UNDER_350K,
    FROM_350K_TO_3M,
    OVER_3M
}
