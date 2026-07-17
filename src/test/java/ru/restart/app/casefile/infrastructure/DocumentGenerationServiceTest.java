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
 * one run produces all six documents in both formats, and regeneration replaces rather than
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
                Clock.fixed(Instant.parse("2026-07-17T10:00:00Z"), ZoneOffset.UTC));
        service = new DocumentGenerationService(caseService, validationService, sections,
                documents, assembler, templates,
                List.of(new TxtDocumentWriter(), new DocxDocumentWriter()));
        currentUser.actAs(UUID.randomUUID());
        existingCase = caseService.create();
    }

    private void fillValidCase() {
        CaseFixtures.validCaseSections(existingCase.id()).forEach(sections::save);
    }

    @Test
    void incompleteCaseIsHardBlocked() {
        assertThatExceptionOfType(GenerationBlockedException.class)
                .isThrownBy(() -> service.generate(existingCase.id()));
        assertThat(documents.findByCaseId(existingCase.id())).isEmpty();
    }

    @Test
    void validCaseGeneratesAllSixDocumentsInBothFormats() {
        fillValidCase();

        List<CaseDocument> generated = service.generate(existingCase.id());

        assertThat(generated).hasSize(DocumentType.values().length * 2);
        assertThat(generated)
                .extracting(CaseDocument::type)
                .containsAll(List.of(DocumentType.values()));
        assertThat(generated)
                .extracting(CaseDocument::templateVersion)
                .containsOnly("test-1");
        assertThat(generated)
                .filteredOn(d -> d.format() == DocumentFormat.DOCX)
                .hasSize(6)
                .allSatisfy(d -> assertThat(new String(d.content(), 0, 2,
                        StandardCharsets.US_ASCII)).isEqualTo("PK"));
    }

    @Test
    void regenerationReplacesInsteadOfDuplicating() {
        fillValidCase();
        List<CaseDocument> first = service.generate(existingCase.id());
        templates.text = "ОБНОВЛЁННЫЙ ТЕКСТ";

        List<CaseDocument> second = service.generate(existingCase.id());

        assertThat(documents.findByCaseId(existingCase.id())).hasSize(12);
        assertThat(second).extracting(CaseDocument::id)
                .containsExactlyInAnyOrderElementsOf(first.stream().map(CaseDocument::id).toList());
        CaseDocument regeneratedTxt = second.stream()
                .filter(d -> d.format() == DocumentFormat.TXT).findFirst().orElseThrow();
        assertThat(new String(regeneratedTxt.content(), StandardCharsets.UTF_8))
                .contains("ОБНОВЛЁННЫЙ ТЕКСТ");
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
