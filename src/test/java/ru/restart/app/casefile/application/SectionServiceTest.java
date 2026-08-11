package ru.restart.app.casefile.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.casefile.domain.CaseSection;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.CaseStatus;
import ru.restart.app.casefile.domain.FieldDefinition;
import ru.restart.app.casefile.domain.FieldType;
import ru.restart.app.casefile.domain.SectionDefinition;
import ru.restart.app.casefile.domain.SectionKey;
import ru.restart.app.casefile.domain.SectionRegistry;
import ru.restart.app.common.error.ResourceNotFoundException;
import ru.restart.app.common.security.AuthenticatedUser;
import ru.restart.app.common.security.CurrentUser;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class SectionServiceTest {

    private final ObjectMapper json = new ObjectMapper();
    private final InMemoryCases cases = new InMemoryCases();
    private final InMemorySections sections = new InMemorySections();
    private final StubCurrentUser currentUser = new StubCurrentUser();
    private final SectionRegistry registry = new StubRegistry();

    private SectionService service;
    private BankruptcyCase existingCase;

    @BeforeEach
    void setUp() {
        CaseService caseService = new CaseService(cases, currentUser);
        ValidationService validationService =
                new ValidationService(caseService, sections, registry, json);
        DocumentGenerationService generationService = new DocumentGenerationService(caseService,
                validationService, sections, new NoDocuments(),
                new CaseModelAssembler(json, java.time.Clock.systemUTC(), region -> Optional.empty(),
                        ru.restart.app.casefile.infrastructure.FeeScheduleFixture.real()),
                new NeverRenderedTemplates(), List.of());
        service = new SectionService(caseService, cases, sections, registry, validationService,
                generationService, new NoDocuments());
        currentUser.actAs(UUID.randomUUID());
        existingCase = caseService.create();
    }

    private JsonNode parse(String content) {
        return json.readTree(content);
    }

    @Test
    void savingARegularSectionPersistsItsPayload() {
        service.put(existingCase.id(), SectionKey.PASSPORT,
                parse("{\"series\": \"1234\", \"number\": \"567890\"}"));

        SectionContent content = service.get(existingCase.id(), SectionKey.PASSPORT);
        assertThat(content.payloadJson()).contains("567890");
    }

    @Test
    void firstSavedStepMovesTheDraftToInProgress() {
        assertThat(existingCase.status()).isEqualTo(CaseStatus.DRAFT);

        service.put(existingCase.id(), SectionKey.PASSPORT, parse("{\"series\": \"1234\"}"));

        assertThat(cases.findById(existingCase.id()).orElseThrow().status())
                .isEqualTo(CaseStatus.IN_PROGRESS);
    }

    @Test
    void resubmittingAStepReplacesItsData() {
        service.put(existingCase.id(), SectionKey.PASSPORT, parse("{\"series\": \"1111\"}"));
        service.put(existingCase.id(), SectionKey.PASSPORT, parse("{\"series\": \"2222\"}"));

        assertThat(sections.findByCaseId(existingCase.id())).hasSize(1);
        assertThat(service.get(existingCase.id(), SectionKey.PASSPORT).payloadJson())
                .contains("2222")
                .doesNotContain("1111");
    }

    @Test
    void unknownFieldsAreRejected() {
        assertThatExceptionOfType(InvalidSectionPayloadException.class)
                .isThrownBy(() -> service.put(existingCase.id(), SectionKey.PASSPORT,
                        parse("{\"series\": \"1234\", \"favoriteColor\": \"violet\"}")))
                .withMessageContaining("favoriteColor");
    }

    @Test
    void regularSectionRejectsAnArray() {
        assertThatExceptionOfType(InvalidSectionPayloadException.class)
                .isThrownBy(() -> service.put(existingCase.id(), SectionKey.PASSPORT,
                        parse("[{\"series\": \"1234\"}]")));
    }

    @Test
    void repeatableSectionRejectsASingleObject() {
        assertThatExceptionOfType(InvalidSectionPayloadException.class)
                .isThrownBy(() -> service.put(existingCase.id(), SectionKey.CREDITORS,
                        parse("{\"name\": \"Банк\"}")));
    }

    @Test
    void repeatableEntriesAreAddedAndRemovedByResubmission() {
        service.put(existingCase.id(), SectionKey.CREDITORS,
                parse("[{\"name\": \"Банк А\"}, {\"name\": \"Банк Б\"}]"));
        assertThat(service.get(existingCase.id(), SectionKey.CREDITORS).payloadJson())
                .contains("Банк А").contains("Банк Б");

        service.put(existingCase.id(), SectionKey.CREDITORS, parse("[{\"name\": \"Банк Б\"}]"));
        assertThat(service.get(existingCase.id(), SectionKey.CREDITORS).payloadJson())
                .doesNotContain("Банк А").contains("Банк Б");
    }

    @Test
    void unknownFieldInsideAnEntryIsRejected() {
        assertThatExceptionOfType(InvalidSectionPayloadException.class)
                .isThrownBy(() -> service.put(existingCase.id(), SectionKey.CREDITORS,
                        parse("[{\"name\": \"Банк\", \"hacker\": true}]")))
                .withMessageContaining("hacker");
    }

    @Test
    void overviewShowsFilledStatePerSectionInOrder() {
        service.put(existingCase.id(), SectionKey.PASSPORT, parse("{\"series\": \"1234\"}"));

        List<SectionOverview> overview = service.overview(existingCase.id());

        assertThat(overview).hasSize(2);
        assertThat(overview.get(0).definition().key()).isEqualTo(SectionKey.PASSPORT);
        assertThat(overview.get(0).filled()).isTrue();
        assertThat(overview.get(1).definition().key()).isEqualTo(SectionKey.CREDITORS);
        assertThat(overview.get(1).filled()).isFalse();
    }

    @Test
    void emptySectionReadsAsNullData() {
        assertThat(service.get(existingCase.id(), SectionKey.CREDITORS).payloadJson()).isNull();
    }

    @Test
    void someoneElsesCaseSectionsAreAnsweredLikeAMissingCase() {
        currentUser.actAs(UUID.randomUUID());

        assertThatExceptionOfType(ResourceNotFoundException.class)
                .isThrownBy(() -> service.put(existingCase.id(), SectionKey.PASSPORT,
                        parse("{\"series\": \"1234\"}")));
        assertThatExceptionOfType(ResourceNotFoundException.class)
                .isThrownBy(() -> service.overview(existingCase.id()));
    }

    private static final class StubRegistry implements SectionRegistry {
        private final List<SectionDefinition> definitions = List.of(
                new SectionDefinition(SectionKey.PASSPORT, 1, false, true, "тест", List.of(),
                        List.of(new FieldDefinition("series", FieldType.PASSPORT_SERIES, true),
                                new FieldDefinition("number", FieldType.PASSPORT_NUMBER, true))),
                new SectionDefinition(SectionKey.CREDITORS, 2, true, true, "тест", List.of("name"),
                        List.of(new FieldDefinition("name", FieldType.STRING, true),
                                new FieldDefinition("debtAmount", FieldType.MONEY, true))));

        @Override
        public List<SectionDefinition> all() {
            return definitions;
        }

        @Override
        public SectionDefinition get(SectionKey key) {
            return definitions.stream().filter(d -> d.key() == key).findFirst().orElseThrow();
        }
    }

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

    private static final class InMemorySections implements CaseSectionRepository {
        private final Map<UUID, CaseSection> byId = new HashMap<>();

        @Override
        public CaseSection save(CaseSection section) {
            byId.put(section.id(), section);
            return section;
        }

        @Override
        public Optional<CaseSection> findByCaseIdAndKey(UUID caseId, SectionKey key) {
            return byId.values().stream()
                    .filter(s -> s.caseId().equals(caseId) && s.key() == key)
                    .findFirst();
        }

        @Override
        public List<CaseSection> findByCaseId(UUID caseId) {
            return byId.values().stream().filter(s -> s.caseId().equals(caseId)).toList();
        }
    }

    private static final class NeverRenderedTemplates
            implements ru.restart.app.doctemplate.api.DocumentTemplates {
        @Override
        public String activeVersion() {
            return "test-0";
        }

        @Override
        public ru.restart.app.doctemplate.api.RenderedDocument render(
                ru.restart.app.doctemplate.api.DocumentType type,
                Map<String, Object> model) {
            throw new UnsupportedOperationException("not rendered in this test");
        }
    }

    private static final class NoDocuments
            implements ru.restart.app.casefile.domain.CaseDocumentRepository {
        @Override
        public ru.restart.app.casefile.domain.CaseDocument save(
                ru.restart.app.casefile.domain.CaseDocument document) {
            throw new UnsupportedOperationException("no documents in this test");
        }

        @Override
        public List<ru.restart.app.casefile.domain.CaseDocument> findByCaseId(UUID caseId) {
            return List.of();
        }

        @Override
        public Optional<ru.restart.app.casefile.domain.CaseDocument> findByIdAndCaseId(
                UUID id, UUID caseId) {
            return Optional.empty();
        }

        @Override
        public Optional<ru.restart.app.casefile.domain.CaseDocument> findByCaseIdAndTypeAndFormat(
                UUID caseId, ru.restart.app.doctemplate.api.DocumentType type,
                ru.restart.app.casefile.domain.DocumentFormat format) {
            return Optional.empty();
        }

        @Override
        public void markAllStale(UUID caseId) {
            throw new UnsupportedOperationException("no documents in this test");
        }
    }

    private static final class StubCurrentUser implements CurrentUser {
        private UUID userId;

        void actAs(UUID userId) {
            this.userId = userId;
        }

        @Override
        public Optional<AuthenticatedUser> get() {
            return Optional.ofNullable(userId)
                    .map(id -> new AuthenticatedUser(id, "user@mail.ru", "ROLE_USER"));
        }

        @Override
        public AuthenticatedUser require() {
            return get().orElseThrow(() -> new AuthenticationCredentialsNotFoundException("none"));
        }
    }
}
