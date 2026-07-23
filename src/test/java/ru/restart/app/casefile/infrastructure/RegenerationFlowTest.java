package ru.restart.app.casefile.infrastructure;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import ru.restart.app.casefile.CaseFixtures;
import ru.restart.app.casefile.application.CaseModelAssembler;
import ru.restart.app.casefile.application.CaseService;
import ru.restart.app.casefile.application.DocumentGenerationService;
import ru.restart.app.casefile.application.SectionService;
import ru.restart.app.casefile.application.ValidationService;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseDocument;
import ru.restart.app.casefile.domain.CaseDocumentRepository;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.casefile.domain.CaseSection;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.DocumentFormat;
import ru.restart.app.casefile.domain.SectionKey;
import ru.restart.app.common.security.AuthenticatedUser;
import ru.restart.app.common.security.CurrentUser;
import ru.restart.app.doctemplate.api.DocumentTemplates;
import ru.restart.app.doctemplate.api.DocumentType;
import ru.restart.app.doctemplate.api.RenderedDocument;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AI-008 regression scenarios against the real validation rules: an edit while the case stays
 * valid regenerates every document automatically with the fresh data; an edit that breaks
 * validity flags all documents stale without touching their bytes; fixing the data regenerates
 * and clears the flags. Full regeneration is the documented choice — every document derives from
 * the whole case model.
 */
class RegenerationFlowTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final InMemoryCases cases = new InMemoryCases();
    private final InMemorySections sections = new InMemorySections();
    private final InMemoryDocuments documents = new InMemoryDocuments();
    private final StubCurrentUser currentUser = new StubCurrentUser();
    private final EchoTemplates templates = new EchoTemplates();

    private SectionService sectionService;
    private DocumentGenerationService generationService;
    private BankruptcyCase existingCase;

    @BeforeEach
    void setUp() {
        CaseService caseService = new CaseService(cases, currentUser);
        YamlSectionRegistry registry = new YamlSectionRegistry();
        ValidationService validationService =
                new ValidationService(caseService, sections, registry, objectMapper);
        generationService = new DocumentGenerationService(caseService, validationService,
                sections, documents,
                new CaseModelAssembler(objectMapper,
                        Clock.fixed(Instant.parse("2026-07-17T10:00:00Z"), ZoneOffset.UTC),
                        new YamlCourtDirectory(), FeeScheduleFixture.real()),
                templates, List.of(new TxtDocumentWriter()));
        sectionService = new SectionService(caseService, cases, sections, registry,
                validationService, generationService, documents);
        currentUser.actAs(UUID.randomUUID());
        existingCase = caseService.create();
        CaseFixtures.VALID_SECTIONS.forEach((key, json) ->
                sectionService.put(existingCase.id(), key, objectMapper.readTree(json)));
        generationService.generate(existingCase.id());
    }

    private String creditorListText() {
        return new String(documents.findByCaseId(existingCase.id()).stream()
                .filter(d -> d.type() == DocumentType.CREDITOR_LIST)
                .findFirst().orElseThrow()
                .content(), StandardCharsets.UTF_8);
    }

    @Test
    void editingDataWhileValidRegeneratesAllDocumentsAutomatically() {
        assertThat(creditorListText()).contains("МФО «Деньги-Быстро»");

        // The user removes the second creditor — still a valid case.
        sectionService.put(existingCase.id(), SectionKey.CREDITORS, objectMapper.readTree("""
                [{"name": "ПАО «Банк Восход»", "inn": "7707083893",
                  "address": "г. Москва, ул. Банковская, д. 3",
                  "debtAmount": 1000000, "debtType": "кредитный договор"}]"""));

        assertThat(documents.findByCaseId(existingCase.id())).hasSize(DocumentType.values().length)
                .allSatisfy(d -> assertThat(d.stale()).isFalse());
        assertThat(creditorListText())
                .doesNotContain("МФО «Деньги-Быстро»")
                .contains("creditorCount=1");
    }

    @Test
    void editingDataIntoAnInvalidStateFlagsEverythingStaleWithoutTouchingContent() {
        String before = creditorListText();

        // The user blanks the passport issue date — case no longer valid, cannot regenerate.
        sectionService.put(existingCase.id(), SectionKey.PASSPORT, objectMapper.readTree("""
                {"series": "4519", "number": "123456",
                 "issuedBy": "ГУ МВД России по г. Москве"}"""));

        assertThat(documents.findByCaseId(existingCase.id())).hasSize(DocumentType.values().length)
                .allSatisfy(d -> assertThat(d.stale()).isTrue());
        assertThat(creditorListText()).isEqualTo(before);
    }

    @Test
    void fixingTheDataRegeneratesAndClearsTheStaleFlags() {
        sectionService.put(existingCase.id(), SectionKey.PASSPORT, objectMapper.readTree("""
                {"series": "4519", "number": "123456",
                 "issuedBy": "ГУ МВД России по г. Москве"}"""));
        assertThat(documents.findByCaseId(existingCase.id()))
                .allSatisfy(d -> assertThat(d.stale()).isTrue());

        sectionService.put(existingCase.id(), SectionKey.PASSPORT, objectMapper.readTree("""
                {"series": "4519", "number": "123456",
                 "issuedBy": "ГУ МВД России по г. Москве", "issueDate": "2019-06-14"}"""));

        assertThat(documents.findByCaseId(existingCase.id())).hasSize(DocumentType.values().length)
                .allSatisfy(d -> assertThat(d.stale()).isFalse());
    }

    @Test
    void documentIdsSurviveRegenerationSoLinksStayValid() {
        List<UUID> before = documents.findByCaseId(existingCase.id()).stream()
                .map(CaseDocument::id).sorted().toList();

        sectionService.put(existingCase.id(), SectionKey.CONTACT_INFO,
                objectMapper.readTree("{\"phone\": \"+7 911 111-11-11\"}"));

        List<UUID> after = documents.findByCaseId(existingCase.id()).stream()
                .map(CaseDocument::id).sorted().toList();
        assertThat(after).isEqualTo(before);
    }

    // --- test doubles -----------------------------------------------------------

    /** Renders a deterministic digest of the model, enough to see which data version is inside. */
    private static final class EchoTemplates implements DocumentTemplates {
        @Override
        public String activeVersion() {
            return "test-1";
        }

        @Override
        @SuppressWarnings("unchecked")
        public RenderedDocument render(DocumentType type, Map<String, Object> model) {
            List<Map<String, Object>> creditors = (List<Map<String, Object>>) model.get("creditors");
            String names = creditors.stream().map(c -> String.valueOf(c.get("name")))
                    .reduce("", (a, b) -> a + " " + b);
            return new RenderedDocument(type, "test-1",
                    type + " creditorCount=" + model.get("creditorCount") + " names:" + names);
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

    private static final class InMemoryDocuments implements CaseDocumentRepository {
        private final Map<UUID, CaseDocument> byId = new HashMap<>();

        @Override
        public CaseDocument save(CaseDocument document) {
            byId.put(document.id(), document);
            return document;
        }

        @Override
        public List<CaseDocument> findByCaseId(UUID caseId) {
            return byId.values().stream().filter(d -> d.caseId().equals(caseId)).toList();
        }

        @Override
        public Optional<CaseDocument> findByIdAndCaseId(UUID id, UUID caseId) {
            return Optional.ofNullable(byId.get(id)).filter(d -> d.caseId().equals(caseId));
        }

        @Override
        public Optional<CaseDocument> findByCaseIdAndTypeAndFormat(UUID caseId, DocumentType type,
                                                                   DocumentFormat format) {
            return byId.values().stream()
                    .filter(d -> d.caseId().equals(caseId) && d.type() == type
                            && d.format() == format)
                    .findFirst();
        }

        @Override
        public void markAllStale(UUID caseId) {
            findByCaseId(caseId).forEach(d -> byId.put(d.id(), new CaseDocument(d.id(),
                    d.caseId(), d.type(), d.format(), d.templateVersion(), d.content(), true)));
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
