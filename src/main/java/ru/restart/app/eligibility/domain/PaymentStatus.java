package ru.restart.app.eligibility.domain;

/**
 * What is happening with the payments right now. Someone who is paying everything on time has no
 * reason to go through a bankruptcy at all, which is why that answer does not simply carry on.
 * PLACEHOLDER pending lawyer review.
 */
public enum PaymentStatus {
    ON_TIME,
    SOME_OVERDUE,
    CANNOT_PAY_MOST,
    NOT_PAYING_FOR_MONTHS,
    /** Taking new loans to service the old ones — a risk marker, never a decision on its own. */
    NEW_LOANS_FOR_OLD
}
