package ru.restart.app.casefile.infrastructure;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import ru.restart.app.casefile.application.CaseService;
import ru.restart.app.casefile.application.SectionService;
import ru.restart.app.casefile.application.ValidationService;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.casefile.domain.CaseSection;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.SectionKey;
import ru.restart.app.common.config.ClockConfig;
import ru.restart.app.common.error.GlobalExceptionHandler;
import ru.restart.app.common.security.AuthenticatedUser;
import ru.restart.app.common.security.RestAccessDeniedHandler;
import ru.restart.app.common.security.RestAuthenticationEntryPoint;
import ru.restart.app.common.security.SecurityConfig;
import ru.restart.app.common.security.SecurityContextCurrentUser;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-slice test with the real security chain, real services, and the real YAML registry; the
 * repositories are mocked. Covers the API contract of the data-collection workflow.
 */
@WebMvcTest(SectionController.class)
@Import({SectionService.class, ValidationService.class, CaseService.class,
        YamlSectionRegistry.class, SecurityContextCurrentUser.class, SecurityConfig.class,
        RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class,
        GlobalExceptionHandler.class, ClockConfig.class,
        SectionControllerTest.EnableSecurity.class})
class SectionControllerTest {

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

    private static RequestPostProcessor user(UUID userId) {
        Authentication auth = new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(userId, "user@mail.ru", "ROLE_USER"), null,
                java.util.List.of(new SimpleGrantedAuthority("ROLE_USER")));
        return authentication(auth);
    }

    private BankruptcyCase ownCase() {
        BankruptcyCase existing = BankruptcyCase.startDraft(USER_ID);
        when(cases.findById(existing.id())).thenReturn(Optional.of(existing));
        return existing;
    }

    @Test
    void anonymousRequestIs401() throws Exception {
        mockMvc.perform(get("/api/v1/cases/" + UUID.randomUUID() + "/sections"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"));
    }

    @Test
    void overviewListsAllSixteenSectionsInOrder() throws Exception {
        BankruptcyCase existing = ownCase();
        when(sections.findByCaseId(existing.id())).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/v1/cases/" + existing.id() + "/sections").with(user(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(SectionKey.values().length))
                .andExpect(jsonPath("$[0].key").value("PERSONAL_DETAILS"))
                .andExpect(jsonPath("$[0].filled").value(false))
                .andExpect(jsonPath("$[8].key").value("CREDITORS"))
                .andExpect(jsonPath("$[8].repeatable").value(true));
    }

    @Test
    void savingASectionEchoesTheStoredData() throws Exception {
        BankruptcyCase existing = ownCase();
        when(sections.findByCaseIdAndKey(existing.id(), SectionKey.PASSPORT))
                .thenReturn(Optional.empty());
        when(sections.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(cases.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/api/v1/cases/" + existing.id() + "/sections/PASSPORT")
                        .with(user(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"series\": \"1234\", \"number\": \"567890\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.key").value("PASSPORT"))
                .andExpect(jsonPath("$.data.series").value("1234"))
                .andExpect(jsonPath("$.fields[0].name").isNotEmpty())
                // Saving is never blocked, but the still-missing required fields come back as issues.
                .andExpect(jsonPath("$.issues[?(@.field == 'issueDate')].code")
                        .value(org.hamcrest.Matchers.hasItem("REQUIRED_FIELD_MISSING")));
    }

    @Test
    void unknownFieldIs400WithTheFieldNamed() throws Exception {
        BankruptcyCase existing = ownCase();

        mockMvc.perform(put("/api/v1/cases/" + existing.id() + "/sections/PASSPORT")
                        .with(user(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"series\": \"1234\", \"favoriteColor\": \"violet\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("favoriteColor")));
    }

    @Test
    void repeatableSectionRejectsAnObjectPayload() throws Exception {
        BankruptcyCase existing = ownCase();

        mockMvc.perform(put("/api/v1/cases/" + existing.id() + "/sections/CREDITORS")
                        .with(user(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"Банк\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void emptySectionReadsWithNullData() throws Exception {
        BankruptcyCase existing = ownCase();
        when(sections.findByCaseIdAndKey(existing.id(), SectionKey.CREDITORS))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/cases/" + existing.id() + "/sections/CREDITORS")
                        .with(user(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.repeatable").value(true));
    }

    @Test
    void filledSectionReadsBackItsEntries() throws Exception {
        BankruptcyCase existing = ownCase();
        when(sections.findByCaseIdAndKey(existing.id(), SectionKey.CREDITORS))
                .thenReturn(Optional.of(CaseSection.of(existing.id(), SectionKey.CREDITORS,
                        "[{\"name\": \"Банк А\"}, {\"name\": \"Банк Б\"}]")));

        mockMvc.perform(get("/api/v1/cases/" + existing.id() + "/sections/CREDITORS")
                        .with(user(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].name").value("Банк А"));
    }

    @Test
    void foreignCaseSectionsAreAnsweredLikeAMissingCase() throws Exception {
        BankruptcyCase foreign = BankruptcyCase.startDraft(UUID.randomUUID());
        when(cases.findById(foreign.id())).thenReturn(Optional.of(foreign));

        mockMvc.perform(get("/api/v1/cases/" + foreign.id() + "/sections").with(user(USER_ID)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }
}
