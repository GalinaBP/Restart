package ru.restart.app.casefile.infrastructure;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import ru.restart.app.casefile.application.CaseService;
import ru.restart.app.casefile.application.ClaimDeadlineService;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.casefile.domain.CaseSection;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.ClaimDeadline;
import ru.restart.app.casefile.domain.ClaimDeadlinePolicy;
import ru.restart.app.casefile.domain.SectionKey;
import ru.restart.app.common.config.ClockConfig;
import ru.restart.app.common.error.GlobalExceptionHandler;
import ru.restart.app.common.security.AuthenticatedUser;
import ru.restart.app.common.security.RestAccessDeniedHandler;
import ru.restart.app.common.security.RestAuthenticationEntryPoint;
import ru.restart.app.common.security.SecurityConfig;
import ru.restart.app.common.security.SecurityContextCurrentUser;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-slice test of the claim-filing deadline endpoint (backlog AI-025), mirroring
 * {@code JourneyControllerTest}: real security chain and real {@link ClaimDeadlineService}, only
 * the repositories and the config-backed policy are mocked.
 */
@WebMvcTest(ClaimDeadlineController.class)
@Import({ClaimDeadlineService.class, CaseService.class, SecurityContextCurrentUser.class,
        SecurityConfig.class, RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class,
        GlobalExceptionHandler.class, ClockConfig.class,
        ClaimDeadlineControllerTest.EnableSecurity.class})
class ClaimDeadlineControllerTest {

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
    private ClaimDeadlinePolicy policy;

    private static RequestPostProcessor user(UUID userId) {
        Authentication auth = new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(userId, "user@mail.ru", "ROLE_USER"), null,
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
        mockMvc.perform(get("/api/v1/cases/" + UUID.randomUUID() + "/claim-deadline"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"));
    }

    @Test
    void withAPublicationDateOnFileTheDeadlineIsComputed() throws Exception {
        BankruptcyCase existing = ownCase();
        when(sections.findByCaseIdAndKey(existing.id(), SectionKey.EFRSB_PUBLICATION))
                .thenReturn(Optional.of(CaseSection.of(existing.id(), SectionKey.EFRSB_PUBLICATION,
                        "{\"publicationDate\": \"2026-06-01\", \"messageNumber\": \"12345\"}")));
        when(policy.current()).thenReturn(
                new ClaimDeadline(60, false, "ст. 213.8 127-ФЗ (ПЛЕЙСХОЛДЕР)"));

        mockMvc.perform(get("/api/v1/cases/" + existing.id() + "/claim-deadline")
                        .with(user(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicationDate").value("2026-06-01"))
                .andExpect(jsonPath("$.deadlineDate").value("2026-07-31"))
                .andExpect(jsonPath("$.daysFromPublication").value(60))
                .andExpect(jsonPath("$.confirmed").value(false));
    }

    @Test
    void withoutAPublicationDateThereIsNoDeadline() throws Exception {
        BankruptcyCase existing = ownCase();
        when(sections.findByCaseIdAndKey(existing.id(), SectionKey.EFRSB_PUBLICATION))
                .thenReturn(Optional.empty());
        when(policy.current()).thenReturn(
                new ClaimDeadline(60, false, "ст. 213.8 127-ФЗ (ПЛЕЙСХОЛДЕР)"));

        mockMvc.perform(get("/api/v1/cases/" + existing.id() + "/claim-deadline")
                        .with(user(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicationDate").doesNotExist())
                .andExpect(jsonPath("$.deadlineDate").doesNotExist())
                .andExpect(jsonPath("$.daysFromPublication").value(60));
    }

    @Test
    void aConfirmedPeriodSurfacesAsConfirmed() throws Exception {
        BankruptcyCase existing = ownCase();
        when(sections.findByCaseIdAndKey(existing.id(), SectionKey.EFRSB_PUBLICATION))
                .thenReturn(Optional.empty());
        when(policy.current()).thenReturn(
                new ClaimDeadline(60, true, "ст. 213.8 127-ФЗ"));

        mockMvc.perform(get("/api/v1/cases/" + existing.id() + "/claim-deadline")
                        .with(user(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmed").value(true));
    }

    @Test
    void foreignCaseIsAnsweredLikeAMissingOne() throws Exception {
        BankruptcyCase foreign = BankruptcyCase.startDraft(UUID.randomUUID());
        when(cases.findById(foreign.id())).thenReturn(Optional.of(foreign));

        mockMvc.perform(get("/api/v1/cases/" + foreign.id() + "/claim-deadline")
                        .with(user(USER_ID)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }
}
