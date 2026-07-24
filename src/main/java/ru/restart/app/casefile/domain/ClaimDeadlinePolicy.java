package ru.restart.app.casefile.domain;

/**
 * The configured claim-filing deadline period (backlog AI-025). Implemented in the infrastructure
 * layer over {@code casefile/claim-deadline.yml}, so the period changes by editing config rather
 * than code — mirrors {@link FeeScheduleRegistry}.
 */
public interface ClaimDeadlinePolicy {

    ClaimDeadline current();
}
