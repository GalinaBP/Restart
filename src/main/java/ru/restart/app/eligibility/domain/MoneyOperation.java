package ru.restart.app.eligibility.domain;

/** What the unusual account activity of the last year looked like. PLACEHOLDER pending review. */
public enum MoneyOperation {
    LARGE_CASH_WITHDRAWALS,
    TRANSFERS_TO_OTHERS,
    RECEIPTS_FROM_OTHERS,
    BETWEEN_OWN_ACCOUNTS,
    OTHER
}
