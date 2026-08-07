package ru.restart.app.eligibility.domain;

/**
 * What the debts are made of. Consumer debts are what this product is built for; anything else
 * either needs a lawyer or means bankruptcy will not give the person what they hope for.
 * PLACEHOLDER pending lawyer review.
 */
public enum DebtType {
    /** Loans and credit cards. */
    CREDITS,
    MICROLOANS,
    INSTALMENTS,
    TAXES,
    /** Money owed to private people. */
    PRIVATE_PERSONS,
    ALIMONY,
    LIFE_HEALTH_HARM,
    OTHER,
    UNKNOWN
}
