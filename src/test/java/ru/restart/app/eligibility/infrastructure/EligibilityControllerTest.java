package ru.restart.app.eligibility.infrastructure;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.web.servlet.MockMvc;
import ru.restart.app.common.config.ClockConfig;
import ru.restart.app.common.error.GlobalExceptionHandler;
import ru.restart.app.common.security.RestAccessDeniedHandler;
import ru.restart.app.common.security.RestAuthenticationEntryPoint;
import ru.restart.app.common.security.SecurityConfig;
import ru.restart.app.eligibility.application.EligibilityService;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EligibilityController.class)
@Import({EligibilityService.class, SecurityConfig.class, RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class, GlobalExceptionHandler.class, ClockConfig.class,
        EligibilityControllerTest.EnableSecurity.class})
class EligibilityControllerTest {

    @TestConfiguration
    @EnableWebSecurity
    static class EnableSecurity {
    }

    @Autowired
    private MockMvc mockMvc;

    private static String body(String debtRange, boolean anyMarker) {
        return """
                {
                  "debtRange": "%s",
                  "debtTypes": ["CREDITS"],
                  "paymentStatus": "CANNOT_PAY_MOST",
                  "loanAge": "OVER_YEAR_AGO",
                  "newLoansAfterTrouble": "NO",
                  "property": [%2$s],
                  "businessStatus": "NONE",
                  "soldOrGiftedAssets": "NO",
                  "maritalStatus": "NO",
                  "hasForeignAssets": false,
                  "hasLawsuits": "NO",
                  "hasEnforcementProceedings": "NO",
                  "unusualMoneyOperations": "NO",
                  "specialCircumstances": ["NONE"],
                  "costsReadiness": "READY",
                  "preferredPath": "SELF_SERVICE"
                }
                """.formatted(debtRange, anyMarker ? "\"VEHICLE\"" : "\"NOTHING\"");
    }

    @Test
    void fittingCaseIsOkAnonymously() throws Exception {
        mockMvc.perform(post("/api/v1/eligibility/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("FROM_500K_TO_1M", false)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("SELF_SERVICE_OK"))
                .andExpect(jsonPath("$.reasons").isEmpty());
    }

    @Test
    void debtsThatSurviveBankruptcyAreNotRecommended() throws Exception {
        mockMvc.perform(post("/api/v1/eligibility/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("FROM_500K_TO_1M", false)
                                .replace("[\"CREDITS\"]", "[\"CREDITS\", \"ALIMONY\"]")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("NOT_RECOMMENDED"))
                .andExpect(jsonPath("$.reasons[0]").isNotEmpty());
    }

    @Test
    void theSmallestDebtStillFits() throws Exception {
        mockMvc.perform(post("/api/v1/eligibility/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("UNDER_500K", false)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("SELF_SERVICE_OK"));
    }

    @Test
    void complexCaseReturnsReasons() throws Exception {
        mockMvc.perform(post("/api/v1/eligibility/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("FROM_500K_TO_1M", true)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("NEEDS_LAWYER"))
                .andExpect(jsonPath("$.reasons[0]").isNotEmpty());
    }

    @Test
    void missingAnswerIsValidationError() throws Exception {
        mockMvc.perform(post("/api/v1/eligibility/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"debtRange\":\"FROM_500K_TO_1M\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors").isNotEmpty());
    }

    @Test
    void unknownDebtRangeIsBadRequestNot500() throws Exception {
        mockMvc.perform(post("/api/v1/eligibility/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("A_BILLION", false)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
