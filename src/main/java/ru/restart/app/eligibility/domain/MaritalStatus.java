package ru.restart.app.eligibility.domain;

/**
 * Marriage now or in the last three years — property acquired in a marriage is shared, and deals
 * with it are looked at separately. PLACEHOLDER pending lawyer review.
 */
public enum MaritalStatus {
    NO,
    MARRIED,
    DIVORCED_WITHIN_3_YEARS
}
