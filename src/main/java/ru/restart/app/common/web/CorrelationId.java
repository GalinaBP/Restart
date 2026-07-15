package ru.restart.app.common.web;

import org.slf4j.MDC;

import java.util.UUID;

/**
 * Constants and helpers for the per-request correlation identifier. The identifier is placed in the
 * SLF4J {@link MDC} by {@link CorrelationIdFilter} so it appears in every log line and can be echoed
 * back to clients in error responses and the {@code X-Correlation-Id} header.
 */
public final class CorrelationId {

    public static final String HEADER = "X-Correlation-Id";
    public static final String MDC_KEY = "correlationId";

    /**
     * Maximum accepted length of a correlation id. Kept in sync with the
     * {@code audit_events.correlation_id} column width so a persisted id can never overflow it and
     * roll back the audited operation.
     */
    public static final int MAX_LENGTH = 64;

    private CorrelationId() {
    }

    /** Returns the current correlation id, generating a fallback if none is bound to the thread. */
    public static String current() {
        String value = MDC.get(MDC_KEY);
        return value != null ? value : UUID.randomUUID().toString();
    }
}
