package ru.restart.app.casefile.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import ru.restart.app.casefile.domain.DocumentFormat;
import ru.restart.app.common.persistence.BaseEntity;
import ru.restart.app.doctemplate.api.DocumentType;

import java.util.UUID;

@Entity
@Table(name = "case_document")
public class CaseDocumentEntity extends BaseEntity {

    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "case_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID caseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 64)
    private DocumentType documentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false, length = 16)
    private DocumentFormat format;

    @Column(name = "template_version", nullable = false, length = 32)
    private String templateVersion;

    @Column(name = "content", nullable = false)
    private byte[] content;

    @Column(name = "stale", nullable = false)
    private boolean stale;

    protected CaseDocumentEntity() {
    }

    CaseDocumentEntity(UUID id, UUID caseId, DocumentType documentType, DocumentFormat format,
                       String templateVersion, byte[] content, boolean stale) {
        this.id = id;
        this.caseId = caseId;
        this.documentType = documentType;
        this.format = format;
        this.templateVersion = templateVersion;
        this.content = content;
        this.stale = stale;
    }

    void replaceContent(String templateVersion, byte[] content, boolean stale) {
        this.templateVersion = templateVersion;
        this.content = content;
        this.stale = stale;
    }

    void markStale() {
        this.stale = true;
    }

    UUID getId() {
        return id;
    }

    UUID getCaseId() {
        return caseId;
    }

    DocumentType getDocumentType() {
        return documentType;
    }

    DocumentFormat getFormat() {
        return format;
    }

    String getTemplateVersion() {
        return templateVersion;
    }

    byte[] getContent() {
        return content;
    }

    boolean isStale() {
        return stale;
    }
}
