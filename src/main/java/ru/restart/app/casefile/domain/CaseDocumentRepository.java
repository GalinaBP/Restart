package ru.restart.app.casefile.domain;

import ru.restart.app.doctemplate.api.DocumentType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Persistence port for generated documents. Save is an upsert on (case, type, format): a
 * regenerated document replaces the previous edition, never sits next to it.
 */
public interface CaseDocumentRepository {

    CaseDocument save(CaseDocument document);

    List<CaseDocument> findByCaseId(UUID caseId);

    Optional<CaseDocument> findByIdAndCaseId(UUID id, UUID caseId);

    Optional<CaseDocument> findByCaseIdAndTypeAndFormat(UUID caseId, DocumentType type,
                                                        DocumentFormat format);
}
