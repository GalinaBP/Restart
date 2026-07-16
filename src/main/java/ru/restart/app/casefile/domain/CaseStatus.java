package ru.restart.app.casefile.domain;

/**
 * Lifecycle of a case (backlog AI-001). Every new case starts as {@link #DRAFT}; a case stops
 * counting as "active" only once {@link #FILED}.
 */
public enum CaseStatus {
    DRAFT,
    IN_PROGRESS,
    READY,
    FILED
}
