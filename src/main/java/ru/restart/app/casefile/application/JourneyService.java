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
import ru.restart.app.casefile.domain.SectionKey;
import ru.restart.app.casefile.domain.StageDefinition;
import ru.restart.app.casefile.domain.StageStatus;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class JourneyService {

    private final CaseService cases;
    private final CaseRepository caseRepository;
    private final CaseJourneyStageRepository stages;
    private final CaseSectionRepository sections;
    private final CaseDocumentRepository documents;
    private final JourneyRegistry registry;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public JourneyService(CaseService cases, CaseRepository caseRepository,
                          CaseJourneyStageRepository stages, CaseSectionRepository sections,
                          CaseDocumentRepository documents, JourneyRegistry registry,
                          ObjectMapper objectMapper, Clock clock) {
        this.cases = cases;
        this.caseRepository = caseRepository;
        this.stages = stages;
        this.sections = sections;
        this.documents = documents;
        this.registry = registry;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

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

    @Transactional
    public JourneyView recordProcedureType(UUID caseId, ProcedureType procedureType) {
        BankruptcyCase bankruptcyCase = cases.get(caseId);
        caseRepository.save(bankruptcyCase.withProcedureType(procedureType));
        return journeyOf(caseId);
    }

    private StageStatus derivedStatus(JourneyStage stage, UUID caseId) {
        return switch (stage) {
            case SCREENING -> StageStatus.DONE;
            case DOCUMENT_PREPARATION -> documentPreparationStatus(caseId);
            case FEES_AND_DEPOSIT -> paymentStatus(caseId);
            case FILING -> filingStatus(caseId);
            default -> throw new IllegalStateException(
                    "Stage " + stage + " is marked derived but has no derivation rule");
        };
    }

    private StageStatus filingStatus(UUID caseId) {
        JsonNode submission = sections.findByCaseIdAndKey(caseId, SectionKey.FILING_SUBMISSION)
                .map(section -> objectMapper.readTree(section.payloadJson()))
                .orElse(null);
        return hasText(submission, "submissionDate") ? StageStatus.DONE : StageStatus.NOT_STARTED;
    }

    private StageStatus paymentStatus(UUID caseId) {
        JsonNode payments = sections.findByCaseIdAndKey(caseId, SectionKey.PAYMENTS)
                .map(section -> objectMapper.readTree(section.payloadJson()))
                .orElse(null);
        boolean duty = hasText(payments, "stateDutyPaidOn");
        boolean deposit = hasText(payments, "depositPaidOn");
        if (duty && deposit) {
            return StageStatus.DONE;
        }
        return duty || deposit ? StageStatus.IN_PROGRESS : StageStatus.NOT_STARTED;
    }

    private static boolean hasText(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value != null && !value.isNull() && !value.asString().isBlank();
    }

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
