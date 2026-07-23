package ru.restart.app.casefile.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.restart.app.casefile.domain.JourneyStage;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface CaseJourneyStageJpaRepository extends JpaRepository<CaseJourneyStageEntity, UUID> {

    List<CaseJourneyStageEntity> findByCaseId(UUID caseId);

    Optional<CaseJourneyStageEntity> findByCaseIdAndStage(UUID caseId, JourneyStage stage);
}
