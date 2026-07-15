package ru.restart.app.common.event;

import java.time.Instant;

/**
 * Marker for domain events published between modules via Spring's {@code ApplicationEventPublisher}.
 * Concrete events are immutable records defined inside the publishing module's {@code api} (or
 * {@code domain}) package so subscribers — notably {@code audit} — can consume them without reaching
 * into the publisher's internals.
 */
public interface DomainEvent {

    /** When the event occurred (UTC). */
    Instant occurredAt();
}
