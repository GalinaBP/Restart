package ru.restart.app.casefile.domain;

/**
 * The two things a filing costs (backlog AI-021). Amounts live in {@code casefile/fees.yml};
 * this enum only fixes what can be charged.
 */
public enum FeeItem {
    /** Государственная пошлина — paid to the tax authority, receipt attached to the filing. */
    STATE_DUTY,
    /** Депозит на вознаграждение финансового управляющего — paid into the court's account. */
    MANAGER_DEPOSIT
}
