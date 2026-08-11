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
import ru.restart.app.casefile.application.JourneyService;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseDocumentRepository;
import ru.restart.app.casefile.domain.CaseJourneyStage;
import ru.restart.app.casefile.domain.CaseJourneyStageRepository;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.CaseStatus;
import ru.restart.app.casefile.domain.CaseType;
import ru.restart.app.casefile.domain.JourneyStage;
import ru.restart.app.casefile.domain.ProcedureType;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(JourneyController.class)
@Import({JourneyService.class, CaseService.class, YamlJourneyRegistry.class,
        SecurityContextCurrentUser.class, SecurityConfig.class, RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class, GlobalExceptionHandler.class, ClockConfig.class,
        JourneyControllerTest.EnableSecurity.class})
class JourneyControllerTest {

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
    private CaseJourneyStageRepository stages;

    @MockitoBean
    private CaseSectionRepository sections;

    @MockitoBean
    private CaseDocumentRepository documents;

    private static RequestPostProcessor user(UUID userId) {
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                new AuthenticatedUser(userId, "user@mail.ru", "ROLE_USER"), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        return authentication(authentication);
    }

    private BankruptcyCase ownCase() {
        BankruptcyCase existing = new BankruptcyCase(UUID.randomUUID(), USER_ID,
                CaseType.PERSONAL_BANKRUPTCY, CaseStatus.IN_PROGRESS, null);
        when(cases.findById(existing.id())).thenReturn(Optional.of(existing));
        when(stages.findByCaseId(existing.id())).thenReturn(List.of());
        when(sections.findByCaseId(existing.id())).thenReturn(List.of());
        when(documents.findByCaseId(existing.id())).thenReturn(List.of());
        return existing;
    }

    @Test
    void journeyListsTheCommonPathWithScreeningAlreadyBehindUs() throws Exception {
        BankruptcyCase existing = ownCase();

        mockMvc.perform(get("/api/v1/cases/" + existing.id() + "/journey").with(user(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages.length()").value(8))
                .andExpect(jsonPath("$.procedureType").doesNotExist())
                .andExpect(jsonPath("$.currentStage").value("MANAGER_SELECTION"))
                .andExpect(jsonPath("$.stages[0].stage").value("SCREENING"))
                .andExpect(jsonPath("$.stages[0].status").value("DONE"))
                .andExpect(jsonPath("$.stages[0].editable").value(false))
                .andExpect(jsonPath("$.stages[1].current").value(true));
    }

    @Test
    void recordingAStageEchoesTheUpdatedMap() throws Exception {
        BankruptcyCase existing = ownCase();
        when(stages.findByCaseIdAndStage(existing.id(), JourneyStage.COURT_DECISION))
                .thenReturn(Optional.empty());
        when(stages.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(stages.findByCaseId(existing.id())).thenAnswer(invocation ->
                List.of(CaseJourneyStage.record(existing.id(), JourneyStage.COURT_DECISION,
                        ru.restart.app.casefile.domain.StageStatus.DONE,
                        java.time.LocalDate.parse("2026-07-23"), null, "Заседание прошло",
                        java.time.Instant.parse("2026-07-23T10:00:00Z"))));

        mockMvc.perform(put("/api/v1/cases/" + existing.id() + "/journey/COURT_DECISION")
                        .with(user(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "DONE", "startedOn": "2026-07-23",
                                 "note": "Заседание прошло"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages[5].stage").value("COURT_DECISION"))
                .andExpect(jsonPath("$.stages[5].status").value("DONE"))
                .andExpect(jsonPath("$.stages[5].note").value("Заседание прошло"));
    }

    @Test
    void recordingADerivedStageIsRefused() throws Exception {
        BankruptcyCase existing = ownCase();

        mockMvc.perform(put("/api/v1/cases/" + existing.id() + "/journey/DOCUMENT_PREPARATION")
                        .with(user(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"DONE\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_STATE"));
    }

    @Test
    void aMissingStatusIsAValidationError() throws Exception {
        BankruptcyCase existing = ownCase();

        mockMvc.perform(put("/api/v1/cases/" + existing.id() + "/journey/COURT_DECISION")
                        .with(user(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\": \"без статуса\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void recordingTheDerivedFilingStageIsRefused() throws Exception {
        BankruptcyCase existing = ownCase();

        mockMvc.perform(put("/api/v1/cases/" + existing.id() + "/journey/FILING")
                        .with(user(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"DONE\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_STATE"));
    }

    @Test
    void anUnknownStageIsRejected() throws Exception {
        BankruptcyCase existing = ownCase();

        mockMvc.perform(put("/api/v1/cases/" + existing.id() + "/journey/NOT_A_STAGE")
                        .with(user(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"DONE\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void recordingTheProcedureRevealsThatBranchOnly() throws Exception {
        BankruptcyCase existing = ownCase();
        when(cases.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(cases.findById(existing.id())).thenReturn(Optional.of(existing),
                Optional.of(existing.withProcedureType(ProcedureType.REALIZATION)));

        mockMvc.perform(put("/api/v1/cases/" + existing.id() + "/journey/procedure-type")
                        .with(user(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"procedureType\": \"REALIZATION\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.procedureType").value("REALIZATION"))
                .andExpect(jsonPath("$.stages.length()").value(11))
                .andExpect(jsonPath("$.stages[*].stage")
                        .value(org.hamcrest.Matchers.hasItems("PROPERTY_INVENTORY",
                                "PROPERTY_REALIZATION", "CREDITOR_PAYOUTS")))
                .andExpect(jsonPath("$.stages[?(@.stage == 'RESTRUCTURING_PLAN')]").isEmpty())
                .andExpect(jsonPath("$.stages[?(@.stage == 'SETTLEMENT_AGREEMENT')]").isEmpty())
                .andExpect(jsonPath("$.stages[?(@.branch == 'REALIZATION')].stage")
                        .value(org.hamcrest.Matchers.hasItem("PROPERTY_REALIZATION")));
    }

    @Test
    void someoneElsesCaseIsNotFound() throws Exception {
        BankruptcyCase existing = ownCase();

        mockMvc.perform(get("/api/v1/cases/" + existing.id() + "/journey")
                        .with(user(UUID.randomUUID())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void journeyWithoutATokenIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/cases/" + UUID.randomUUID() + "/journey"))
                .andExpect(status().isUnauthorized());
    }
}
