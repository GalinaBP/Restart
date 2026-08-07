package ru.restart.app.eligibility.domain;

/**
 * Whether the mandatory costs of the procedure are within reach. The court will not start without
 * them, so "unsure" and "no money" both mean "come back later" rather than "see a lawyer".
 */
public enum CostsReadiness {
    READY,
    UNSURE,
    NO_MONEY
}
