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
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-slice test with the real security chain and real use cases; only the repository is mocked.
 * The caller is authenticated by planting the shared {@link AuthenticatedUser} principal directly —
 * token mechanics belong to the auth module and are tested there, not re-imported here.
 */
@WebMvcTest(CaseController.class)
@Import({CaseService.class, SecurityContextCurrentUser.class, SecurityConfig.class,
        RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class,
        GlobalExceptionHandler.class, ClockConfig.class, CaseControllerTest.EnableSecurity.class})
class CaseControllerTest {

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

    private static RequestPostProcessor user(UUID userId) {
        Authentication auth = new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(userId, "user@mail.ru", "ROLE_USER"), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        return authentication(auth);
    }

    @Test
    void anonymousRequestIs401() throws Exception {
        mockMvc.perform(post("/api/v1/cases"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"));
    }

    @Test
    void createReturnsADraftCase() throws Exception {
        when(cases.findActiveByUserId(USER_ID)).thenReturn(Optional.empty());
        when(cases.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/v1/cases").with(user(USER_ID)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.caseType").value("PERSONAL_BANKRUPTCY"));
    }

    @Test
    void secondActiveCaseIs409() throws Exception {
        when(cases.findActiveByUserId(USER_ID))
                .thenReturn(Optional.of(BankruptcyCase.startDraft(USER_ID)));

        mockMvc.perform(post("/api/v1/cases").with(user(USER_ID)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_STATE"));
    }

    @Test
    void currentWithoutACaseIs404() throws Exception {
        when(cases.findActiveByUserId(USER_ID)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/cases/current").with(user(USER_ID)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void ownerReadsTheirCaseById() throws Exception {
        BankruptcyCase existing = BankruptcyCase.startDraft(USER_ID);
        when(cases.findById(existing.id())).thenReturn(Optional.of(existing));

        mockMvc.perform(get("/api/v1/cases/" + existing.id()).with(user(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(existing.id().toString()));
    }

    @Test
    void foreignCaseIsAnsweredLikeAMissingOne() throws Exception {
        BankruptcyCase foreign = BankruptcyCase.startDraft(UUID.randomUUID());
        when(cases.findById(foreign.id())).thenReturn(Optional.of(foreign));

        mockMvc.perform(get("/api/v1/cases/" + foreign.id()).with(user(USER_ID)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }
}
