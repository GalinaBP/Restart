package ru.restart.app.casefile.domain;

import ru.restart.app.doctemplate.api.DocumentType;

import java.util.Objects;
import java.util.UUID;

/**
 * One generated filing document of a case, in one file format. Carries the template version it
 * was rendered from, so any file can be traced to the exact template edition (AI-005 requirement).
 */
public class CaseDocument {

    private final UUID id;
    private final UUID caseId;
    private final DocumentType type;
    private final DocumentFormat format;
    private final String templateVersion;
    private final byte[] content;

    public CaseDocument(UUID id, UUID caseId, DocumentType type, DocumentFormat format,
                        String templateVersion, byte[] content) {
        this.id = Objects.requireNonNull(id, "id");
        this.caseId = Objects.requireNonNull(caseId, "caseId");
        this.type = Objects.requireNonNull(type, "type");
        this.format = Objects.requireNonNull(format, "format");
        this.templateVersion = Objects.requireNonNull(templateVersion, "templateVersion");
        this.content = Objects.requireNonNull(content, "content");
    }

    public static CaseDocument of(UUID caseId, DocumentType type, DocumentFormat format,
                                  String templateVersion, byte[] content) {
        return new CaseDocument(UUID.randomUUID(), caseId, type, format, templateVersion, content);
    }

    public String filename() {
        return type.templateName() + "." + format.extension();
    }

    public UUID id() {
        return id;
    }

    public UUID caseId() {
        return caseId;
    }

    public DocumentType type() {
        return type;
    }

    public DocumentFormat format() {
        return format;
    }

    public String templateVersion() {
        return templateVersion;
    }

    public byte[] content() {
        return content;
    }
}
