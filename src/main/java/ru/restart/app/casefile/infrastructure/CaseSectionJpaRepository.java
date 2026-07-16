package ru.restart.app.casefile.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.restart.app.casefile.domain.SectionKey;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface CaseSectionJpaRepository extends JpaRepository<CaseSectionEntity, UUID> {

    Optional<CaseSectionEntity> findByCaseIdAndSectionKey(UUID caseId, SectionKey sectionKey);

    List<CaseSectionEntity> findByCaseId(UUID caseId);
}
