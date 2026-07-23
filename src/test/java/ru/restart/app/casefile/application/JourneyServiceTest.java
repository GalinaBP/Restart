package ru.restart.app.casefile.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseDocument;
import ru.restart.app.casefile.domain.CaseDocumentRepository;
import ru.restart.app.casefile.domain.CaseJourneyStage;
import ru.restart.app.casefile.domain.CaseJourneyStageRepository;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.casefile.domain.CaseSection;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.DocumentFormat;
import ru.restart.app.casefile.domain.JourneyStage;
import ru.restart.app.casefile.domain.ProcedureType;
import ru.restart.app.casefile.domain.SectionKey;
import ru.restart.app.casefile.domain.StageStatus;
import ru.restart.app.casefile.infrastructure.JourneyRegistryFixture;
import ru.restart.app.common.security.AuthenticatedUser;
import ru.restart.app.common.security.CurrentUser;
import ru.restart.app.doctemplate.api.DocumentType;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

/**
 * The state machine behind the journey map (backlog AI-018), driven by the real
 * {@code journey.yml} through an in-memory repository set — no Spring context.
 */
class JourneyServiceTest {

    private final InMemoryCases cases = new InMemoryCases();
    private final InMemoryStages stages = new InMemoryStages();
    private final InMemorySections sections = new InMemorySections();
    private final InMemoryDocuments documents = new InMemoryDocuments();
    private final StubCurrentUser currentUser = new StubCurrentUser();
    private final Clock clock = Clock.fixed(Instant.parse("2026-07-23T10:00:00Z"), ZoneOffset.UTC);

    private JourneyService service;
    private UUID caseId;

    @BeforeEach
    void setUp() {
        CaseService caseService = new CaseService(cases, currentUser);
        service = new JourneyService(caseService, cases, stages, sections, documents,
                JourneyRegistryFixture.real(), new tools.jackson.databind.ObjectMapper(), clock);
        UUID userId = UUID.randomUUID();
        currentUser.actAs(userId);
        caseId = cases.save(BankruptcyCase.startDraft(userId)).id();
    }

    private StageView stage(JourneyView journey, JourneyStage stage) {
        return journey.stages().stream()
                .filter(view -> view.stage() == stage)
                .findFirst()
                .orElseThrow(() -> new AssertionError("stage not in journey: " + stage));
    }

    @Test
    void freshCaseShowsOnlyTheCommonPathAndStartsAtDocumentPreparation() {
        JourneyView journey = service.journeyOf(caseId);

        assertThat(journey.procedureType()).isEmpty();
        assertThat(journey.stages()).extracting(StageView::stage)
                .containsExactly(JourneyStage.SCREENING, JourneyStage.DOCUMENT_PREPARATION,
                        JourneyStage.MANAGER_SELECTION, JourneyStage.FEES_AND_DEPOSIT,
                        JourneyStage.FILING, JourneyStage.COURT_DECISION,
                        JourneyStage.CREDITOR_CLAIMS, JourneyStage.COMPLETION);
        // Screening is behind us by construction — the case exists only because it passed.
        assertThat(stage(journey, JourneyStage.SCREENING).status()).isEqualTo(StageStatus.DONE);
        assertThat(journey.currentStage()).contains(JourneyStage.DOCUMENT_PREPARATION);
    }

    @Test
    void documentPreparationFollowsTheCaseDataRatherThanBeingRecorded() {
        assertThat(stage(service.journeyOf(caseId), JourneyStage.DOCUMENT_PREPARATION).status())
                .isEqualTo(StageStatus.NOT_STARTED);

        sections.save(CaseSection.of(caseId, SectionKey.PASSPORT, "{\"series\": \"4519\"}"));
        assertThat(stage(service.journeyOf(caseId), JourneyStage.DOCUMENT_PREPARATION).status())
                .isEqualTo(StageStatus.IN_PROGRESS);

        documents.save(CaseDocument.of(caseId, DocumentType.BANKRUPTCY_APPLICATION,
                DocumentFormat.TXT, "2026-06-21.1", "text".getBytes()));
        assertThat(stage(service.journeyOf(caseId), JourneyStage.DOCUMENT_PREPARATION).status())
                .isEqualTo(StageStatus.DONE);
    }

    @Test
    void staleDocumentsPutDocumentPreparationBackInProgress() {
        sections.save(CaseSection.of(caseId, SectionKey.PASSPORT, "{\"series\": \"4519\"}"));
        documents.save(CaseDocument.of(caseId, DocumentType.BANKRUPTCY_APPLICATION,
                DocumentFormat.TXT, "2026-06-21.1", "text".getBytes()));
        documents.markAllStale(caseId);

        assertThat(stage(service.journeyOf(caseId), JourneyStage.DOCUMENT_PREPARATION).status())
                .isEqualTo(StageStatus.IN_PROGRESS);
    }

    @Test
    void derivedStagesCannotBeRecordedByHand() {
        assertThatExceptionOfType(DerivedStageException.class).isThrownBy(() ->
                service.recordStage(caseId, JourneyStage.DOCUMENT_PREPARATION, StageStatus.DONE,
                        null, null, null));
        assertThatExceptionOfType(DerivedStageException.class).isThrownBy(() ->
                service.recordStage(caseId, JourneyStage.SCREENING, StageStatus.DONE,
                        null, null, null));
    }

    @Test
    void recordingAStageKeepsItsDatesAndNote() {
        JourneyView journey = service.recordStage(caseId, JourneyStage.COURT_DECISION,
                StageStatus.DONE, LocalDate.parse("2026-07-20"), LocalDate.parse("2026-07-22"),
                "Заседание прошло, определение вынесено");

        StageView decision = stage(journey, JourneyStage.COURT_DECISION);
        assertThat(decision.status()).isEqualTo(StageStatus.DONE);
        assertThat(decision.startedOn()).isEqualTo(LocalDate.parse("2026-07-20"));
        assertThat(decision.completedOn()).isEqualTo(LocalDate.parse("2026-07-22"));
        assertThat(decision.note()).isEqualTo("Заседание прошло, определение вынесено");
    }

    @Test
    void theFeesStageFollowsThePaymentsSectionRatherThanBeingRecorded() {
        assertThat(stage(service.journeyOf(caseId), JourneyStage.FEES_AND_DEPOSIT).status())
                .isEqualTo(StageStatus.NOT_STARTED);

        // Only the duty paid so far — half done is not done:
        sections.save(CaseSection.of(caseId, SectionKey.PAYMENTS,
                "{\"stateDutyPaidOn\": \"2026-07-20\"}"));
        assertThat(stage(service.journeyOf(caseId), JourneyStage.FEES_AND_DEPOSIT).status())
                .isEqualTo(StageStatus.IN_PROGRESS);

        sections.save(CaseSection.of(caseId, SectionKey.PAYMENTS,
                "{\"stateDutyPaidOn\": \"2026-07-20\", \"depositPaidOn\": \"2026-07-21\"}"));
        assertThat(stage(service.journeyOf(caseId), JourneyStage.FEES_AND_DEPOSIT).status())
                .isEqualTo(StageStatus.DONE);
    }

    @Test
    void theFeesStageCannotBeTickedByHand() {
        // Otherwise the map could claim the filing is paid for with no payment on file.
        assertThatExceptionOfType(DerivedStageException.class).isThrownBy(() ->
                service.recordStage(caseId, JourneyStage.FEES_AND_DEPOSIT, StageStatus.DONE,
                        null, null, null));
    }

    @Test
    void theFilingStageFollowsTheSubmissionSection() {
        assertThat(stage(service.journeyOf(caseId), JourneyStage.FILING).status())
                .isEqualTo(StageStatus.NOT_STARTED);

        sections.save(CaseSection.of(caseId, SectionKey.FILING_SUBMISSION,
                "{\"submissionDate\": \"2026-07-23\", \"courtName\": \"Арбитражный суд г. Москвы\"}"));

        assertThat(stage(service.journeyOf(caseId), JourneyStage.FILING).status())
                .isEqualTo(StageStatus.DONE);
    }

    @Test
    void theFilingStageCannotBeTickedByHand() {
        // Otherwise the map could claim a filing that never reached the court.
        assertThatExceptionOfType(DerivedStageException.class).isThrownBy(() ->
                service.recordStage(caseId, JourneyStage.FILING, StageStatus.DONE,
                        null, null, null));
    }

    @Test
    void recordingTheSameStageTwiceReplacesTheProgressInPlace() {
        service.recordStage(caseId, JourneyStage.COURT_DECISION, StageStatus.IN_PROGRESS,
                null, null, "…");
        JourneyView journey = service.recordStage(caseId, JourneyStage.COURT_DECISION,
                StageStatus.DONE, null, LocalDate.parse("2026-07-23"), "Рассмотрено");

        assertThat(stages.findByCaseId(caseId)).hasSize(1);
        assertThat(stage(journey, JourneyStage.COURT_DECISION).status()).isEqualTo(StageStatus.DONE);
    }

    @Test
    void theCurrentStageIsTheFirstOneNotYetDone() {
        sections.save(CaseSection.of(caseId, SectionKey.PASSPORT, "{\"series\": \"4519\"}"));
        documents.save(CaseDocument.of(caseId, DocumentType.BANKRUPTCY_APPLICATION,
                DocumentFormat.TXT, "2026-06-21.1", "text".getBytes()));

        assertThat(service.journeyOf(caseId).currentStage())
                .contains(JourneyStage.MANAGER_SELECTION);

        service.recordStage(caseId, JourneyStage.MANAGER_SELECTION, StageStatus.DONE,
                null, null, null);

        assertThat(service.journeyOf(caseId).currentStage())
                .contains(JourneyStage.FEES_AND_DEPOSIT);
    }

    @Test
    void aBlockedStageStaysTheCurrentOne() {
        service.recordStage(caseId, JourneyStage.COURT_DECISION, StageStatus.BLOCKED,
                null, null, "Ждём заседание 12.08.2026");

        // Waiting on the court is not progress — the user is still on that stage.
        assertThat(stage(service.journeyOf(caseId), JourneyStage.COURT_DECISION).status())
                .isEqualTo(StageStatus.BLOCKED);
        assertThat(service.journeyOf(caseId).currentStage())
                .contains(JourneyStage.DOCUMENT_PREPARATION);
    }

    @Test
    void recordingTheProcedureRevealsExactlyThatBranch() {
        JourneyView journey = service.recordProcedureType(caseId, ProcedureType.REALIZATION);

        assertThat(journey.procedureType()).contains(ProcedureType.REALIZATION);
        assertThat(journey.stages()).extracting(StageView::stage)
                .contains(JourneyStage.PROPERTY_REALIZATION)
                .doesNotContain(JourneyStage.RESTRUCTURING_PLAN,
                        JourneyStage.SETTLEMENT_AGREEMENT);
        // The branch stages sit between the court's decision and the common tail:
        assertThat(journey.stages()).extracting(StageView::stage)
                .containsSubsequence(JourneyStage.COURT_DECISION,
                        JourneyStage.PROPERTY_REALIZATION, JourneyStage.CREDITOR_CLAIMS);
    }

    @Test
    void eachProcedureHasItsOwnSequenceAndNoneOfTheOthers() {
        // AI-024: the three procedures are materially different, so each is its own run of
        // stages — not one shared stage with a different label.
        assertThat(stagesOf(ProcedureType.RESTRUCTURING))
                .containsSubsequence(JourneyStage.RESTRUCTURING_PLAN,
                        JourneyStage.RESTRUCTURING_PLAN_APPROVAL,
                        JourneyStage.RESTRUCTURING_EXECUTION)
                .doesNotContain(JourneyStage.PROPERTY_INVENTORY, JourneyStage.PROPERTY_REALIZATION,
                        JourneyStage.CREDITOR_PAYOUTS, JourneyStage.SETTLEMENT_TERMS,
                        JourneyStage.SETTLEMENT_AGREEMENT);

        assertThat(stagesOf(ProcedureType.REALIZATION))
                .containsSubsequence(JourneyStage.PROPERTY_INVENTORY,
                        JourneyStage.PROPERTY_REALIZATION, JourneyStage.CREDITOR_PAYOUTS)
                .doesNotContain(JourneyStage.RESTRUCTURING_PLAN,
                        JourneyStage.RESTRUCTURING_PLAN_APPROVAL,
                        JourneyStage.RESTRUCTURING_EXECUTION, JourneyStage.SETTLEMENT_TERMS,
                        JourneyStage.SETTLEMENT_AGREEMENT);

        assertThat(stagesOf(ProcedureType.SETTLEMENT))
                .containsSubsequence(JourneyStage.SETTLEMENT_TERMS,
                        JourneyStage.SETTLEMENT_AGREEMENT)
                .doesNotContain(JourneyStage.RESTRUCTURING_PLAN, JourneyStage.PROPERTY_INVENTORY,
                        JourneyStage.PROPERTY_REALIZATION, JourneyStage.CREDITOR_PAYOUTS);
    }

    @Test
    void everyBranchKeepsTheCommonHeadAndTail() {
        for (ProcedureType procedure : ProcedureType.values()) {
            assertThat(stagesOf(procedure))
                    .as("common path preserved on the %s branch", procedure)
                    .containsSubsequence(JourneyStage.SCREENING, JourneyStage.DOCUMENT_PREPARATION,
                            JourneyStage.MANAGER_SELECTION, JourneyStage.FEES_AND_DEPOSIT,
                            JourneyStage.FILING, JourneyStage.COURT_DECISION)
                    .endsWith(JourneyStage.CREDITOR_CLAIMS, JourneyStage.COMPLETION);
        }
    }

    @Test
    void beforeTheCourtDecidesNoBranchStageIsVisibleAtAll() {
        // The regression AI-024 asks for: the single common path still works untouched.
        assertThat(service.journeyOf(caseId).stages()).extracting(StageView::stage)
                .doesNotContain(JourneyStage.RESTRUCTURING_PLAN,
                        JourneyStage.RESTRUCTURING_PLAN_APPROVAL,
                        JourneyStage.RESTRUCTURING_EXECUTION, JourneyStage.PROPERTY_INVENTORY,
                        JourneyStage.PROPERTY_REALIZATION, JourneyStage.CREDITOR_PAYOUTS,
                        JourneyStage.SETTLEMENT_TERMS, JourneyStage.SETTLEMENT_AGREEMENT);
    }

    @Test
    void progressRecordedOnOneBranchSurvivesACorrectionBackToIt() {
        service.recordProcedureType(caseId, ProcedureType.REALIZATION);
        service.recordStage(caseId, JourneyStage.PROPERTY_INVENTORY, StageStatus.DONE,
                null, LocalDate.parse("2026-09-01"), "Опись составлена");

        // The user corrects the procedure, then corrects it back:
        service.recordProcedureType(caseId, ProcedureType.RESTRUCTURING);
        JourneyView back = service.recordProcedureType(caseId, ProcedureType.REALIZATION);

        StageView inventory = stage(back, JourneyStage.PROPERTY_INVENTORY);
        assertThat(inventory.status()).isEqualTo(StageStatus.DONE);
        assertThat(inventory.note()).isEqualTo("Опись составлена");
    }

    private List<JourneyStage> stagesOf(ProcedureType procedure) {
        return service.recordProcedureType(caseId, procedure).stages().stream()
                .map(StageView::stage)
                .toList();
    }

    @Test
    void aCorrectedProcedureSwapsTheBranchAndClearingItReturnsToTheCommonPath() {
        service.recordProcedureType(caseId, ProcedureType.RESTRUCTURING);

        JourneyView corrected = service.recordProcedureType(caseId, ProcedureType.SETTLEMENT);
        assertThat(corrected.stages()).extracting(StageView::stage)
                .contains(JourneyStage.SETTLEMENT_AGREEMENT)
                .doesNotContain(JourneyStage.RESTRUCTURING_PLAN);

        JourneyView cleared = service.recordProcedureType(caseId, null);
        assertThat(cleared.procedureType()).isEmpty();
        assertThat(cleared.stages()).extracting(StageView::stage)
                .doesNotContain(JourneyStage.SETTLEMENT_AGREEMENT,
                        JourneyStage.RESTRUCTURING_PLAN, JourneyStage.PROPERTY_REALIZATION);
    }

    @Test
    void derivedStagesAreMarkedNotEditableAndTheRestAre() {
        JourneyView journey = service.journeyOf(caseId);

        assertThat(stage(journey, JourneyStage.SCREENING).editable()).isFalse();
        assertThat(stage(journey, JourneyStage.DOCUMENT_PREPARATION).editable()).isFalse();
        assertThat(stage(journey, JourneyStage.FEES_AND_DEPOSIT).editable()).isFalse();
        assertThat(stage(journey, JourneyStage.FILING).editable()).isFalse();
        assertThat(stage(journey, JourneyStage.MANAGER_SELECTION).editable()).isTrue();
    }

    @Test
    void everyStageCarriesItsStatutoryBasisForTheLawyerReview() {
        assertThat(service.journeyOf(caseId).stages())
                .allSatisfy(view -> assertThat(view.statutoryBasis()).contains("ПЛЕЙСХОЛДЕР"));
    }

    // --- test doubles -----------------------------------------------------------

    private static final class InMemoryCases implements CaseRepository {
        private final Map<UUID, BankruptcyCase> byId = new HashMap<>();

        @Override
        public BankruptcyCase save(BankruptcyCase bankruptcyCase) {
            byId.put(bankruptcyCase.id(), bankruptcyCase);
            return bankruptcyCase;
        }

        @Override
        public Optional<BankruptcyCase> findById(UUID id) {
            return Optional.ofNullable(byId.get(id));
        }

        @Override
        public Optional<BankruptcyCase> findActiveByUserId(UUID userId) {
            return byId.values().stream()
                    .filter(c -> c.isOwnedBy(userId) && c.isActive())
                    .findFirst();
        }
    }

    private static final class InMemoryStages implements CaseJourneyStageRepository {
        private final Map<UUID, CaseJourneyStage> byId = new HashMap<>();

        @Override
        public CaseJourneyStage save(CaseJourneyStage stage) {
            byId.put(stage.id(), stage);
            return stage;
        }

        @Override
        public List<CaseJourneyStage> findByCaseId(UUID caseId) {
            return byId.values().stream().filter(s -> s.caseId().equals(caseId)).toList();
        }

        @Override
        public Optional<CaseJourneyStage> findByCaseIdAndStage(UUID caseId, JourneyStage stage) {
            return findByCaseId(caseId).stream().filter(s -> s.stage() == stage).findFirst();
        }
    }

    private static final class InMemorySections implements CaseSectionRepository {
        private final List<CaseSection> all = new ArrayList<>();

        /** Upsert on (case, key), like the real repository — re-saving a step replaces it. */
        @Override
        public CaseSection save(CaseSection section) {
            all.removeIf(s -> s.caseId().equals(section.caseId()) && s.key() == section.key());
            all.add(section);
            return section;
        }

        @Override
        public Optional<CaseSection> findByCaseIdAndKey(UUID caseId, SectionKey key) {
            return all.stream()
                    .filter(s -> s.caseId().equals(caseId) && s.key() == key)
                    .findFirst();
        }

        @Override
        public List<CaseSection> findByCaseId(UUID caseId) {
            return all.stream().filter(s -> s.caseId().equals(caseId)).toList();
        }
    }

    private static final class InMemoryDocuments implements CaseDocumentRepository {
        private final List<CaseDocument> all = new ArrayList<>();

        @Override
        public CaseDocument save(CaseDocument document) {
            all.add(document);
            return document;
        }

        @Override
        public List<CaseDocument> findByCaseId(UUID caseId) {
            return all.stream().filter(d -> d.caseId().equals(caseId)).toList();
        }

        @Override
        public Optional<CaseDocument> findByIdAndCaseId(UUID id, UUID caseId) {
            return all.stream()
                    .filter(d -> d.id().equals(id) && d.caseId().equals(caseId))
                    .findFirst();
        }

        @Override
        public Optional<CaseDocument> findByCaseIdAndTypeAndFormat(UUID caseId, DocumentType type,
                                                                   DocumentFormat format) {
            return all.stream()
                    .filter(d -> d.caseId().equals(caseId) && d.type() == type
                            && d.format() == format)
                    .findFirst();
        }

        @Override
        public void markAllStale(UUID caseId) {
            all.replaceAll(d -> d.caseId().equals(caseId)
                    ? new CaseDocument(d.id(), d.caseId(), d.type(), d.format(),
                    d.templateVersion(), d.content(), true)
                    : d);
        }
    }

    private static final class StubCurrentUser implements CurrentUser {
        private UUID userId;

        void actAs(UUID id) {
            this.userId = id;
        }

        @Override
        public Optional<AuthenticatedUser> get() {
            return Optional.ofNullable(userId)
                    .map(id -> new AuthenticatedUser(id, "user@mail.ru", "ROLE_USER"));
        }

        @Override
        public AuthenticatedUser require() {
            return get().orElseThrow(() -> new IllegalStateException("no caller"));
        }
    }
}
