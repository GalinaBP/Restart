package ru.restart.app.casefile.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseDocumentRepository;
import ru.restart.app.casefile.domain.CaseJourneyStage;
import ru.restart.app.casefile.domain.CaseJourneyStageRepository;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.JourneyRegistry;
import ru.restart.app.casefile.domain.JourneyStage;
import ru.restart.app.casefile.domain.ProcedureType;
import ru.restart.app.casefile.domain.StageDefinition;
import ru.restart.app.casefile.domain.StageStatus;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * The guided journey through the court procedure (backlog AI-018).
 *
 * <p>Two kinds of stage meet here. <strong>Derived</strong> stages (screening, document
 * preparation) read their status off the case itself, so the journey map can never disagree with
 * what the case actually contains — the Document Builder keeps working exactly as before and
 * simply shows up as one stage of the larger journey. Every other stage happens out in the real
 * world (a payment, a court hearing, a manager's report), so only the user can say where it
 * stands; those are recorded through {@link #recordStage}.
 *
 * <p>Ownership is enforced through {@link CaseService}, per the module's convention: someone
 * else's case is answered exactly like a case that does not exist.
 */
@Service
public class JourneyService {

    private final CaseService cases;
    private final CaseRepository caseRepository;
    private final CaseJourneyStageRepository stages;
    private final CaseSectionRepository sections;
    private final CaseDocumentRepository documents;
    private final JourneyRegistry registry;
    private final Clock clock;

    public JourneyService(CaseService cases, CaseRepository caseRepository,
                          CaseJourneyStageRepository stages, CaseSectionRepository sections,
                          CaseDocumentRepository documents, JourneyRegistry registry, Clock clock) {
        this.cases = cases;
        this.caseRepository = caseRepository;
        this.stages = stages;
        this.sections = sections;
        this.documents = documents;
        this.registry = registry;
        this.clock = clock;
    }

    /** The journey of the caller's case: which stages apply, where each stands, what is next. */
    @Transactional(readOnly = true)
    public JourneyView journeyOf(UUID caseId) {
        BankruptcyCase bankruptcyCase = cases.get(caseId);
        Optional<ProcedureType> procedure = bankruptcyCase.procedureType();

        Map<JourneyStage, CaseJourneyStage> recorded = new EnumMap<>(JourneyStage.class);
        for (CaseJourneyStage stage : stages.findByCaseId(caseId)) {
            recorded.put(stage.stage(), stage);
        }

        List<StageView> views = new ArrayList<>();
        JourneyStage current = null;
        for (StageDefinition definition : registry.forProcedure(procedure)) {
            CaseJourneyStage progress = recorded.get(definition.key());
            StageStatus status = definition.derived()
                    ? derivedStatus(definition.key(), caseId)
                    : progress == null ? StageStatus.NOT_STARTED : progress.status();
            // The first stage that is not finished is the one to work on now.
            boolean isCurrent = current == null && status != StageStatus.DONE;
            if (isCurrent) {
                current = definition.key();
            }
            views.add(new StageView(definition.key(), definition.order(), definition.branch(),
                    status,
                    progress == null ? null : progress.startedOn(),
                    progress == null ? null : progress.completedOn(),
                    progress == null ? null : progress.note(),
                    isCurrent, !definition.derived(), definition.statutoryBasis()));
        }
        return new JourneyView(views, procedure, Optional.ofNullable(current));
    }

    /**
     * Records where a stage stands. Rejects derived stages: their status comes from the case data,
     * and letting it be overwritten would make the journey map lie about the case.
     */
    @Transactional
    public JourneyView recordStage(UUID caseId, JourneyStage stage, StageStatus status,
                                   LocalDate startedOn, LocalDate completedOn, String note) {
        cases.get(caseId);
        StageDefinition definition = registry.get(stage);
        if (definition.derived()) {
            throw new DerivedStageException(stage);
        }
        CaseJourneyStage updated = stages.findByCaseIdAndStage(caseId, stage)
                .map(existing -> existing.updatedTo(status, startedOn, completedOn, note,
                        clock.instant()))
                .orElseGet(() -> CaseJourneyStage.record(caseId, stage, status, startedOn,
                        completedOn, note, clock.instant()));
        stages.save(updated);
        return journeyOf(caseId);
    }

    /**
     * Records the procedure the court applied, switching the journey to that branch (AI-024).
     * {@code null} clears it — the user may have recorded the wrong one.
     */
    @Transactional
    public JourneyView recordProcedureType(UUID caseId, ProcedureType procedureType) {
        BankruptcyCase bankruptcyCase = cases.get(caseId);
        caseRepository.save(bankruptcyCase.withProcedureType(procedureType));
        return journeyOf(caseId);
    }

    /**
     * Status of a stage the case data already answers. Screening is behind us by construction —
     * a case only exists once the screening said a self-guided restart fits.
     */
    private StageStatus derivedStatus(JourneyStage stage, UUID caseId) {
        return switch (stage) {
            case SCREENING -> StageStatus.DONE;
            case DOCUMENT_PREPARATION -> documentPreparationStatus(caseId);
            default -> throw new IllegalStateException(
                    "Stage " + stage + " is marked derived but has no derivation rule");
        };
    }

    /** Done once the filing documents exist and none of them is outdated (AI-008). */
    private StageStatus documentPreparationStatus(UUID caseId) {
        var generated = documents.findByCaseId(caseId);
        if (!generated.isEmpty() && generated.stream().noneMatch(document -> document.stale())) {
            return StageStatus.DONE;
        }
        boolean anythingCollected = !sections.findByCaseId(caseId).isEmpty();
        return anythingCollected || !generated.isEmpty()
                ? StageStatus.IN_PROGRESS
                : StageStatus.NOT_STARTED;
    }
}
