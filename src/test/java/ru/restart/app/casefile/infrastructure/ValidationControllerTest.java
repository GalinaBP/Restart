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

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ValidationController.class)
@Import({ValidationService.class, CaseService.class, YamlSectionRegistry.class,
        SecurityContextCurrentUser.class, SecurityConfig.class, RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class, GlobalExceptionHandler.class, ClockConfig.class,
        ValidationControllerTest.EnableSecurity.class})
class ValidationControllerTest {

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
        mockMvc.perform(get("/api/v1/cases/" + UUID.randomUUID() + "/validation"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anUntouchedCaseReportsEveryMandatorySectionAsEmpty() throws Exception {
        BankruptcyCase existing = ownCase();
        when(sections.findByCaseId(existing.id())).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/cases/" + existing.id() + "/validation").with(user()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.issues[*].code").value(hasItem("SECTION_EMPTY")))
                .andExpect(jsonPath("$.issues[?(@.code == 'SECTION_EMPTY')].section")
                        .value(hasItem("CREDITORS")))
                .andExpect(jsonPath("$.issues[?(@.section == 'VEHICLES')]").isEmpty());
    }

    @Test
    void findingsAreAddressedToTheExactSectionEntryAndField() throws Exception {
        BankruptcyCase existing = ownCase();
        when(sections.findByCaseId(existing.id())).thenReturn(List.of(
                CaseSection.of(existing.id(), SectionKey.PERSONAL_DETAILS,
                        "{\"lastName\": \"Иванова\", \"firstName\": \"Анна\", "
                                + "\"birthDate\": \"1999-05-20\", \"birthPlace\": \"Москва\", "
                                + "\"inn\": \"7707083894\"}"),
                CaseSection.of(existing.id(), SectionKey.CREDITORS,
                        "[{\"name\": \"Банк\", \"address\": \"Москва\", \"debtAmount\": 100000}, "
                                + "{\"name\": \"Банк\", \"address\": \"Москва\", \"debtAmount\": 5}]")));

        mockMvc.perform(get("/api/v1/cases/" + existing.id() + "/validation").with(user()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath(
                        "$.issues[?(@.section == 'PERSONAL_DETAILS' && @.field == 'inn')].code")
                        .value(hasItem("INVALID_INN")))
                .andExpect(jsonPath(
                        "$.issues[?(@.section == 'CREDITORS' && @.code == 'DUPLICATE_ENTRY')].entryIndex")
                        .value(hasItem(1)));
    }

    @Test
    void foreignCaseIsAnsweredLikeAMissingOne() throws Exception {
        BankruptcyCase foreign = BankruptcyCase.startDraft(UUID.randomUUID());
        when(cases.findById(foreign.id())).thenReturn(Optional.of(foreign));

        mockMvc.perform(get("/api/v1/cases/" + foreign.id() + "/validation").with(user()))
                .andExpect(status().isNotFound());
    }
}
