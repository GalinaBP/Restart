package ru.restart.app.casefile.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Persistence port for recorded stage progress (backlog AI-018). */
public interface CaseJourneyStageRepository {

    CaseJourneyStage save(CaseJourneyStage stage);

    List<CaseJourneyStage> findByCaseId(UUID caseId);

    Optional<CaseJourneyStage> findByCaseIdAndStage(UUID caseId, JourneyStage stage);
}
