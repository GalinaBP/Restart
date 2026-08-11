package ru.restart.app.casefile.domain;

import ru.restart.app.doctemplate.api.DocumentType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CaseDocumentRepository {

    CaseDocument save(CaseDocument document);

    List<CaseDocument> findByCaseId(UUID caseId);

    Optional<CaseDocument> findByIdAndCaseId(UUID id, UUID caseId);

    Optional<CaseDocument> findByCaseIdAndTypeAndFormat(UUID caseId, DocumentType type,
                                                        DocumentFormat format);

    void markAllStale(UUID caseId);
}
