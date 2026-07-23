package ru.restart.app.casefile.infrastructure;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import ru.restart.app.casefile.CaseFixtures;
import ru.restart.app.casefile.application.CaseModelAssembler;
import ru.restart.app.casefile.application.CaseService;
import ru.restart.app.casefile.application.DocumentGenerationService;
import ru.restart.app.casefile.application.GenerationBlockedException;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

/**
 * The generation pipeline against the REAL validation rules (sections.yml) and real file writers;
 * only templates are stubbed (their rendering is covered in the doctemplate module's tests). In
 * particular this pins: the shared fixtures pass validation, incomplete cases are hard-blocked,
 * one run produces every document in all formats, and regeneration replaces rather than
 * duplicates.
 */
class DocumentGenerationServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final InMemoryCases cases = new InMemoryCases();
    private final InMemorySections sections = new InMemorySections();
    private final InMemoryDocuments documents = new InMemoryDocuments();
    private final StubCurrentUser currentUser = new StubCurrentUser();
    private final StubTemplates templates = new StubTemplates();

    private DocumentGenerationService service;
    private BankruptcyCase existingCase;

    @BeforeEach
    void setUp() {
        CaseService caseService = new CaseService(cases, currentUser);
        ValidationService validationService = new ValidationService(caseService, sections,
                new YamlSectionRegistry(), objectMapper);
        CaseModelAssembler assembler = new CaseModelAssembler(objectMapper,
                Clock.fixed(Instant.parse("2026-07-17T10:00:00Z"), ZoneOffset.UTC),
                new YamlCourtDirectory(), FeeScheduleFixture.real());
        service = new DocumentGenerationService(caseService, validationService, sections,
                documents, assembler, templates,
                List.of(new TxtDocumentWriter(), new DocxDocumentWriter(), new PdfDocumentWriter()));
        currentUser.actAs(UUID.randomUUID());
        existingCase = caseService.create();
    }

    private void fillValidCase() {
        CaseFixtures.validCaseSections(existingCase.id()).forEach(sections::save);
    }

    @Test
    void incompleteCaseIsHardBlockedWithTheFindingsAttached() {
        assertThatExceptionOfType(GenerationBlockedException.class)
                .isThrownBy(() -> service.generate(existingCase.id()))
                .satisfies(ex -> assertThat(ex.issues())
                        .extracting(i -> i.section().name() + ":" + i.code())
                        .contains("PASSPORT:SECTION_EMPTY", "CREDITORS:SECTION_EMPTY"));
        assertThat(documents.findByCaseId(existingCase.id())).isEmpty();
    }

    @Test
    void specificMissingFieldsAreNamedInTheBlock() {
        // Everything valid except: passport without an issue date, second creditor without address.
        CaseFixtures.validCaseSections(existingCase.id()).forEach(sections::save);
        sections.save(sections.findByCaseIdAndKey(existingCase.id(), SectionKey.PASSPORT)
                .orElseThrow()
                .withPayload("{\"series\": \"4519\", \"number\": \"123456\", "
                        + "\"issuedBy\": \"ГУ МВД России по г. Москве\"}"));
        sections.save(sections.findByCaseIdAndKey(existingCase.id(), SectionKey.CREDITORS)
                .orElseThrow()
                .withPayload("[{\"name\": \"ПАО «Банк Восход»\", \"address\": \"г. Москва\", "
                        + "\"debtAmount\": 1000000}, "
                        + "{\"name\": \"МФО «Деньги-Быстро»\", \"debtAmount\": 250000}]"));

        assertThatExceptionOfType(GenerationBlockedException.class)
                .isThrownBy(() -> service.generate(existingCase.id()))
                .satisfies(ex -> assertThat(ex.issues())
                        .extracting(i -> i.section() + ":" + i.entryIndex() + ":" + i.field())
                        .containsExactlyInAnyOrder(
                                "PASSPORT:null:issueDate",
                                "CREDITORS:1:address"));
    }

    @Test
    void anUnnamedSroBlocksGenerationLikeAnyOtherMissingFact() {
        fillValidCase();
        // The СРО must be named for the court to approve a manager (AI-020) — an address alone
        // is not enough, and the block must name the field rather than fail vaguely.
        sections.save(sections.findByCaseIdAndKey(existingCase.id(), SectionKey.MANAGER_SRO)
                .orElseThrow()
                .withPayload("{\"address\": \"г. Москва, ул. Управляющая, д. 5\"}"));

        assertThatExceptionOfType(GenerationBlockedException.class)
                .isThrownBy(() -> service.generate(existingCase.id()))
                .satisfies(ex -> assertThat(ex.issues())
                        .extracting(i -> i.section() + ":" + i.field())
                        .contains("MANAGER_SRO:name"));
    }

    @Test
    void validCaseGeneratesEveryDocumentInEveryFormat() {
        fillValidCase();

        List<CaseDocument> generated = service.generate(existingCase.id());

        assertThat(generated).hasSize(DocumentType.values().length * 3);
        assertThat(generated)
                .extracting(CaseDocument::type)
                .containsAll(List.of(DocumentType.values()));
        assertThat(generated)
                .extracting(CaseDocument::templateVersion)
                .containsOnly("test-1");
        assertThat(generated)
                .filteredOn(d -> d.format() == DocumentFormat.DOCX)
                .hasSize(DocumentType.values().length)
                .allSatisfy(d -> assertThat(new String(d.content(), 0, 2,
                        StandardCharsets.US_ASCII)).isEqualTo("PK"));
    }

    @Test
    void regenerationReplacesInsteadOfDuplicating() {
        fillValidCase();
        List<CaseDocument> first = service.generate(existingCase.id());
        templates.text = "ОБНОВЛЁННЫЙ ТЕКСТ";

        List<CaseDocument> second = service.generate(existingCase.id());

        assertThat(documents.findByCaseId(existingCase.id())).hasSize(DocumentType.values().length * 3);
        assertThat(second).extracting(CaseDocument::id)
                .containsExactlyInAnyOrderElementsOf(first.stream().map(CaseDocument::id).toList());
        CaseDocument regeneratedTxt = second.stream()
                .filter(d -> d.format() == DocumentFormat.TXT).findFirst().orElseThrow();
        assertThat(new String(regeneratedTxt.content(), StandardCharsets.UTF_8))
                .contains("ОБНОВЛЁННЫЙ ТЕКСТ");
    }

    @Test
    void exportBundlesEveryFileIntoOneZip() throws Exception {
        fillValidCase();

        byte[] zip = service.exportPackage(existingCase.id());

        Map<String, byte[]> entries = new HashMap<>();
        try (java.util.zip.ZipInputStream in =
                     new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(zip))) {
            for (java.util.zip.ZipEntry entry = in.getNextEntry(); entry != null;
                 entry = in.getNextEntry()) {
                entries.put(entry.getName(), in.readAllBytes());
            }
        }
        assertThat(entries).hasSize(DocumentType.values().length * 3);
        assertThat(entries.keySet())
                .contains("bankruptcy_application.docx", "bankruptcy_application.txt",
                        "creditor_list.docx", "filing_checklist.txt");
        // Entry bytes are exactly the stored documents:
        CaseDocument storedTxt = documents
                .findByCaseIdAndTypeAndFormat(existingCase.id(),
                        DocumentType.BANKRUPTCY_APPLICATION, DocumentFormat.TXT)
                .orElseThrow();
        assertThat(entries.get("bankruptcy_application.txt")).isEqualTo(storedTxt.content());
    }

    @Test
    void exportIsBlockedExactlyLikeGeneration() {
        assertThatExceptionOfType(GenerationBlockedException.class)
                .isThrownBy(() -> service.exportPackage(existingCase.id()));
    }

    @Test
    void someoneElsesCaseCannotBeGenerated() {
        fillValidCase();
        currentUser.actAs(UUID.randomUUID());

        assertThatExceptionOfType(ru.restart.app.common.error.ResourceNotFoundException.class)
                .isThrownBy(() -> service.generate(existingCase.id()));
    }

    // --- test doubles -----------------------------------------------------------

    private static final class StubTemplates implements DocumentTemplates {
        private String text = "ТЕКСТ ДОКУМЕНТА Иванова";

        @Override
        public String activeVersion() {
            return "test-1";
        }

        @Override
        public RenderedDocument render(DocumentType type, Map<String, Object> model) {
            return new RenderedDocument(type, "test-1", text + " / " + type);
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
            return new ArrayList<>(byId.values().stream()
                    .filter(d -> d.caseId().equals(caseId)).toList());
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
