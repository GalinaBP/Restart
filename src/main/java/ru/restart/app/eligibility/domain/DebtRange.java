package ru.restart.app.eligibility.domain;

/**
 * Coarse debt-size buckets around the product's 500k–3M ₽ focus (see the constitution). Ranges
 * instead of exact amounts: the user answers in one tap and no financial data is collected at
 * this stage.
 */
public enum DebtRange {
    UNDER_500K,
    FROM_500K_TO_3M,
    OVER_3M
}
