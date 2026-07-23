package ru.restart.app.casefile.domain;

/**
 * How far the case has got with one stage of the procedure (backlog AI-018).
 *
 * <p>{@link #BLOCKED} is deliberately distinct from "not started": it marks a stage the user
 * cannot move forward on right now (waiting on the court, on the manager, on a payment), which
 * the journey map shows differently — being stuck is normal here and should never read as a
 * failure the user caused.
 */
public enum StageStatus {
    NOT_STARTED,
    IN_PROGRESS,
    DONE,
    BLOCKED
}
