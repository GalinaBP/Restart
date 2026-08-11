package ru.restart.app.common.web;

import org.slf4j.MDC;

import java.util.UUID;

public final class CorrelationId {

    public static final String HEADER = "X-Correlation-Id";
    public static final String MDC_KEY = "correlationId";

    public static final int MAX_LENGTH = 64;

    private CorrelationId() {
    }

    public static String current() {
        String value = MDC.get(MDC_KEY);
        return value != null ? value : UUID.randomUUID().toString();
    }
}
