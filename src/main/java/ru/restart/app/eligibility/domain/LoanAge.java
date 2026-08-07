package ru.restart.app.eligibility.domain;

/**
 * When the main loans were taken. Age on its own decides nothing — it only opens the question that
 * matters: whether new money was borrowed once repaying it was already out of reach.
 * PLACEHOLDER pending lawyer review.
 */
public enum LoanAge {
    OVER_YEAR_AGO,
    WITHIN_LAST_YEAR,
    LAST_3_MONTHS,
    DONT_REMEMBER
}
