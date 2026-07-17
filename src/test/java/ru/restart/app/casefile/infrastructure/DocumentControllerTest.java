package ru.restart.app.casefile.infrastructure;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import ru.restart.app.casefile.CaseFixtures;
import ru.restart.app.casefile.application.CaseModelAssembler;
import ru.restart.app.casefile.application.CaseService;
import ru.restart.app.casefile.application.DocumentGenerationService;
import ru.restart.app.casefile.application.ValidationService;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseDocument;
import ru.restart.app.casefile.domain.CaseDocumentRepository;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.DocumentFormat;
import ru.restart.app.common.config.ClockConfig;
import ru.restart.app.common.error.GlobalExceptionHandler;
import ru.restart.app.common.security.AuthenticatedUser;
import ru.restart.app.common.security.RestAccessDeniedHandler;
import ru.restart.app.common.security.RestAuthenticationEntryPoint;
import ru.restart.app.common.security.SecurityConfig;
import ru.restart.app.common.security.SecurityContextCurrentUser;
import ru.restart.app.doctemplate.api.DocumentTemplates;
import ru.restart.app.doctemplate.api.DocumentType;
import ru.restart.app.doctemplate.api.RenderedDocument;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * HTTP contract of the filing-package endpoints, with the real security chain, real validation
 * rules, real writers; repositories and the template module are mocked at their ports.
 */
@WebMvcTest(DocumentController.class)
@Import({DocumentGenerationService.class, ValidationService.class, CaseModelAssembler.class,
        CaseService.class, YamlSectionRegistry.class, TxtDocumentWriter.class,
        DocxDocumentWriter.class, SecurityContextCurrentUser.class, SecurityConfig.class,
        RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class,
        GlobalExceptionHandler.class, ClockConfig.class, DocumentControllerTest.EnableSecurity.class})
class DocumentControllerTest {

    /** See EligibilityControllerTest: Boot 4's web slice needs security switched on explicitly. */
    @TestConfiguration
    @EnableWebSecurity
    static class EnableSecurity {
    }

    private static final UUID USER_ID = UUID.randomUUID();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CaseRepository cases;

    @MockitoBean
    private CaseSectionRepository sections;

    @MockitoBean
    private CaseDocumentRepository documents;

    @MockitoBean
    private DocumentTemplates templates;

    private static RequestPostProcessor user() {
        Authentication auth = new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(USER_ID, "user@mail.ru", "ROLE_USER"), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        return authentication(auth);
    }

    private BankruptcyCase ownCase() {
        BankruptcyCase existing = BankruptcyCase.startDraft(USER_ID);
        when(cases.findById(existing.id())).thenReturn(Optional.of(existing));
        return existing;
    }

    @Test
    void anonymousRequestIs401() throws Exception {
        mockMvc.perform(post("/api/v1/cases/" + UUID.randomUUID() + "/documents"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void blockedGenerationListsTheMissingItemsAddressedToSteps() throws Exception {
        BankruptcyCase existing = ownCase();
        when(sections.findByCaseId(existing.id())).thenReturn(List.of());

        mockMvc.perform(post("/api/v1/cases/" + existing.id() + "/documents").with(user()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("GENERATION_BLOCKED"))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("обязательные разделы")))
                .andExpect(jsonPath("$.missing").isNotEmpty())
                // Every mandatory step shows up as a navigable item; optional ones don't:
                .andExpect(jsonPath("$.missing[*].step").value(
                        org.hamcrest.Matchers.hasItems("PASSPORT", "CREDITORS", "MONTHLY_INCOME")))
                .andExpect(jsonPath("$.missing[?(@.step == 'VEHICLES')]").isEmpty())
                .andExpect(jsonPath("$.missing[0].code").value("SECTION_EMPTY"))
                .andExpect(jsonPath("$.missing[0].message").isNotEmpty());
    }

    @Test
    void aValidCaseYieldsTwelveFiles() throws Exception {
        BankruptcyCase existing = ownCase();
        when(sections.findByCaseId(existing.id()))
                .thenReturn(CaseFixtures.validCaseSections(existing.id()));
        when(documents.findByCaseIdAndTypeAndFormat(eq(existing.id()), any(), any()))
                .thenReturn(Optional.empty());
        when(documents.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(templates.render(any(), any())).thenAnswer(invocation -> new RenderedDocument(
                invocation.getArgument(0), "2026-06-21.1", "ТЕКСТ ДОКУМЕНТА"));

        mockMvc.perform(post("/api/v1/cases/" + existing.id() + "/documents").with(user()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.length()").value(12))
                .andExpect(jsonPath("$[0].templateVersion").value("2026-06-21.1"))
                .andExpect(jsonPath("$[*].filename").value(
                        org.hamcrest.Matchers.hasItems("bankruptcy_application.txt",
                                "bankruptcy_application.docx", "filing_checklist.docx")));
    }

    @Test
    void downloadSendsTheFileWithAttachmentHeaders() throws Exception {
        BankruptcyCase existing = ownCase();
        CaseDocument stored = CaseDocument.of(existing.id(), DocumentType.CREDITOR_LIST,
                DocumentFormat.TXT, "2026-06-21.1",
                "СПИСОК КРЕДИТОРОВ".getBytes(StandardCharsets.UTF_8));
        when(documents.findByIdAndCaseId(stored.id(), existing.id()))
                .thenReturn(Optional.of(stored));

        mockMvc.perform(get("/api/v1/cases/" + existing.id() + "/documents/" + stored.id())
                        .with(user()))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        org.hamcrest.Matchers.containsString("attachment")))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        org.hamcrest.Matchers.containsString("creditor_list.txt")))
                .andExpect(content().contentTypeCompatibleWith("text/plain"))
                .andExpect(content().string("СПИСОК КРЕДИТОРОВ"));
    }

    @Test
    void exportSendsAZipOrTheBlockingContract() throws Exception {
        BankruptcyCase existing = ownCase();
        // Blocked case first — same missing-info contract as generation:
        when(sections.findByCaseId(existing.id())).thenReturn(List.of());
        mockMvc.perform(post("/api/v1/cases/" + existing.id() + "/documents/export").with(user()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("GENERATION_BLOCKED"))
                .andExpect(jsonPath("$.missing").isNotEmpty());

        // Valid case — a zip attachment:
        when(sections.findByCaseId(existing.id()))
                .thenReturn(CaseFixtures.validCaseSections(existing.id()));
        when(documents.findByCaseIdAndTypeAndFormat(eq(existing.id()), any(), any()))
                .thenReturn(Optional.empty());
        when(documents.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(templates.render(any(), any())).thenAnswer(invocation -> new RenderedDocument(
                invocation.getArgument(0), "2026-06-21.1", "ТЕКСТ"));

        byte[] zip = mockMvc.perform(post("/api/v1/cases/" + existing.id() + "/documents/export")
                        .with(user()))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/zip"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        org.hamcrest.Matchers.containsString("restart-filing-package.zip")))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(zip, 0, 2, StandardCharsets.US_ASCII)).isEqualTo("PK");
    }

    @Test
    void someoneElsesDocumentsAreNotFound() throws Exception {
        BankruptcyCase foreign = BankruptcyCase.startDraft(UUID.randomUUID());
        when(cases.findById(foreign.id())).thenReturn(Optional.of(foreign));

        mockMvc.perform(get("/api/v1/cases/" + foreign.id() + "/documents").with(user()))
                .andExpect(status().isNotFound());
    }
}
