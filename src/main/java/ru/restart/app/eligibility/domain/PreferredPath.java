package ru.restart.app.eligibility.domain;

/**
 * How the person wants to go through the procedure — the closing screening question.
 * Choosing {@link #LAWYER} routes to a lawyer regardless of the other answers; the other two
 * carry on through the normal rules.
 */
public enum PreferredPath {
    /** Wants to do it themselves through the app. */
    SELF_SERVICE,
    /** Explicitly asked for a lawyer. */
    LAWYER,
    /** Just looking around for now. */
    EXPLORING
}
