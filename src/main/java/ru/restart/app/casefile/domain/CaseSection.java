package ru.restart.app.casefile.domain;

import java.util.Objects;
import java.util.UUID;

/**
 * The collected data of one section of one case. The payload is kept as the JSON the client
 * submitted (an object, or an array of entry objects for repeatable sections) — field-name
 * screening happens in the application layer against {@link SectionDefinition}; deep value
 * validation is the validation engine's job (backlog AI-003).
 */
public class CaseSection {

    private final UUID id;
    private final UUID caseId;
    private final SectionKey key;
    private final String payloadJson;

    public CaseSection(UUID id, UUID caseId, SectionKey key, String payloadJson) {
        this.id = Objects.requireNonNull(id, "id");
        this.caseId = Objects.requireNonNull(caseId, "caseId");
        this.key = Objects.requireNonNull(key, "key");
        this.payloadJson = Objects.requireNonNull(payloadJson, "payloadJson");
    }

    public static CaseSection of(UUID caseId, SectionKey key, String payloadJson) {
        return new CaseSection(UUID.randomUUID(), caseId, key, payloadJson);
    }

    /** The same section with a replaced payload (used on re-submission of a step). */
    public CaseSection withPayload(String newPayloadJson) {
        return new CaseSection(id, caseId, key, newPayloadJson);
    }

    public UUID id() {
        return id;
    }

    public UUID caseId() {
        return caseId;
    }

    public SectionKey key() {
        return key;
    }

    public String payloadJson() {
        return payloadJson;
    }
}
