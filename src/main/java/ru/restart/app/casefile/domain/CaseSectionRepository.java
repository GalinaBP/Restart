package ru.restart.app.casefile.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CaseSectionRepository {

    CaseSection save(CaseSection section);

    Optional<CaseSection> findByCaseIdAndKey(UUID caseId, SectionKey key);

    List<CaseSection> findByCaseId(UUID caseId);
}
