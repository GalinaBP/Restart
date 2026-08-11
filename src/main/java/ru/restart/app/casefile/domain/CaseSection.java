package ru.restart.app.casefile.domain;

import java.util.Objects;
import java.util.UUID;

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
