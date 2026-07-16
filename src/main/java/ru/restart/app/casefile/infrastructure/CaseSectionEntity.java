package ru.restart.app.casefile.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import ru.restart.app.casefile.domain.SectionKey;
import ru.restart.app.common.persistence.BaseEntity;

import java.util.UUID;

/** JPA mapping of {@code case_section} (see {@code V3__create_case_section.sql}). */
@Entity
@Table(name = "case_section")
public class CaseSectionEntity extends BaseEntity {

    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "case_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID caseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "section_key", nullable = false, length = 64)
    private SectionKey sectionKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false)
    private String payload;

    protected CaseSectionEntity() {
        // JPA
    }

    CaseSectionEntity(UUID id, UUID caseId, SectionKey sectionKey, String payload) {
        this.id = id;
        this.caseId = caseId;
        this.sectionKey = sectionKey;
        this.payload = payload;
    }

    UUID getId() {
        return id;
    }

    UUID getCaseId() {
        return caseId;
    }

    SectionKey getSectionKey() {
        return sectionKey;
    }

    String getPayload() {
        return payload;
    }

    void setPayload(String payload) {
        this.payload = payload;
    }
}
