package ru.restart.app.casefile.infrastructure;

import org.springframework.stereotype.Component;
import ru.restart.app.casefile.domain.CaseJourneyStage;
import ru.restart.app.casefile.domain.CaseJourneyStageRepository;
import ru.restart.app.casefile.domain.JourneyStage;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** JPA-backed implementation of the journey-stage persistence port. */
@Component
class CaseJourneyStageRepositoryAdapter implements CaseJourneyStageRepository {

    private final CaseJourneyStageJpaRepository jpa;

    CaseJourneyStageRepositoryAdapter(CaseJourneyStageJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public CaseJourneyStage save(CaseJourneyStage stage) {
        CaseJourneyStageEntity entity = jpa.findById(stage.id())
                .map(existing -> {
                    existing.update(stage.status(), stage.startedOn(), stage.completedOn(),
                            stage.note());
                    return existing;
                })
                .orElseGet(() -> new CaseJourneyStageEntity(stage.id(), stage.caseId(),
                        stage.stage(), stage.status(), stage.startedOn(), stage.completedOn(),
                        stage.note()));
        return toDomain(jpa.save(entity));
    }

    @Override
    public List<CaseJourneyStage> findByCaseId(UUID caseId) {
        return jpa.findByCaseId(caseId).stream().map(this::toDomain).toList();
    }

    @Override
    public Optional<CaseJourneyStage> findByCaseIdAndStage(UUID caseId, JourneyStage stage) {
        return jpa.findByCaseIdAndStage(caseId, stage).map(this::toDomain);
    }

    private CaseJourneyStage toDomain(CaseJourneyStageEntity entity) {
        return new CaseJourneyStage(entity.getId(), entity.getCaseId(), entity.getStage(),
                entity.getStatus(), entity.getStartedOn(), entity.getCompletedOn(),
                entity.getNote(), entity.getUpdatedAt());
    }
}
