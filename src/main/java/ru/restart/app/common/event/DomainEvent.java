package ru.restart.app.common.event;

import java.time.Instant;

public interface DomainEvent {

    Instant occurredAt();
}
