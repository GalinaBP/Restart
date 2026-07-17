package ru.restart.app.casefile.infrastructure;

import org.springframework.stereotype.Component;
import ru.restart.app.casefile.domain.CaseDocument;
import ru.restart.app.casefile.domain.CaseDocumentRepository;
import ru.restart.app.casefile.domain.DocumentFormat;
import ru.restart.app.doctemplate.api.DocumentType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** JPA-backed implementation of the generated-documents port; save is an upsert on the id. */
@Component
class CaseDocumentRepositoryAdapter implements CaseDocumentRepository {

    private final CaseDocumentJpaRepository jpa;

    CaseDocumentRepositoryAdapter(CaseDocumentJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public CaseDocument save(CaseDocument document) {
        CaseDocumentEntity entity = jpa.findById(document.id())
                .map(existing -> {
                    existing.replaceContent(document.templateVersion(), document.content(),
                            document.stale());
                    return existing;
                })
                .orElseGet(() -> new CaseDocumentEntity(document.id(), document.caseId(),
                        document.type(), document.format(), document.templateVersion(),
                        document.content(), document.stale()));
        return toDomain(jpa.save(entity));
    }

    @Override
    public void markAllStale(UUID caseId) {
        List<CaseDocumentEntity> entities = jpa.findByCaseId(caseId);
        entities.forEach(CaseDocumentEntity::markStale);
        jpa.saveAll(entities);
    }

    @Override
    public List<CaseDocument> findByCaseId(UUID caseId) {
        return jpa.findByCaseId(caseId).stream().map(this::toDomain).toList();
    }

    @Override
    public Optional<CaseDocument> findByIdAndCaseId(UUID id, UUID caseId) {
        return jpa.findByIdAndCaseId(id, caseId).map(this::toDomain);
    }

    @Override
    public Optional<CaseDocument> findByCaseIdAndTypeAndFormat(UUID caseId, DocumentType type,
                                                               DocumentFormat format) {
        return jpa.findByCaseIdAndDocumentTypeAndFormat(caseId, type, format).map(this::toDomain);
    }

    private CaseDocument toDomain(CaseDocumentEntity entity) {
        return new CaseDocument(entity.getId(), entity.getCaseId(), entity.getDocumentType(),
                entity.getFormat(), entity.getTemplateVersion(), entity.getContent(),
                entity.isStale());
    }
}
