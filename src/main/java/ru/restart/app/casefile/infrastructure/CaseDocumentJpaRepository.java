package ru.restart.app.casefile.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.restart.app.casefile.domain.DocumentFormat;
import ru.restart.app.doctemplate.api.DocumentType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface CaseDocumentJpaRepository extends JpaRepository<CaseDocumentEntity, UUID> {

    List<CaseDocumentEntity> findByCaseId(UUID caseId);

    Optional<CaseDocumentEntity> findByIdAndCaseId(UUID id, UUID caseId);

    Optional<CaseDocumentEntity> findByCaseIdAndDocumentTypeAndFormat(UUID caseId,
                                                                      DocumentType documentType,
                                                                      DocumentFormat format);
}
