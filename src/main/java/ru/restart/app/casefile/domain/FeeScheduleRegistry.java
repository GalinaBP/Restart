package ru.restart.app.casefile.domain;

/**
 * The configured cost of filing (backlog AI-021). Implemented in the infrastructure layer over
 * {@code casefile/fees.yml}, so amounts change by editing config rather than code.
 */
public interface FeeScheduleRegistry {

    FeeSchedule current();
}
