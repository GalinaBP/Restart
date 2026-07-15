package ru.restart.app.common.event;

import java.time.Instant;

/**
 * Published when a request is denied — either by the URL security rules or by a per-resource
 * ownership check. Carries only the request path; the acting principal (if any) is resolved by the
 * audit listener from the current request context. Consumed by {@code audit}.
 */
public record ResourceAccessDeniedEvent(String path, Instant occurredAt) implements DomainEvent {
}
