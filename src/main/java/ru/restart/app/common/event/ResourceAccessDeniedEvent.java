package ru.restart.app.common.event;

import java.time.Instant;

public record ResourceAccessDeniedEvent(String path, Instant occurredAt) implements DomainEvent {
}
