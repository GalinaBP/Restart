package ru.restart.app.eligibility.domain;

public enum PaymentStatus {
    ON_TIME,
    SOME_OVERDUE,
    CANNOT_PAY_MOST,
    NOT_PAYING_FOR_MONTHS,
    NEW_LOANS_FOR_OLD
}
