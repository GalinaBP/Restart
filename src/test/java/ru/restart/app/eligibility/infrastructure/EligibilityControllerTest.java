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

/**
 * Web-slice test: anonymous access, validation of missing answers, and the two decision shapes.
 * Imports the shared security/error configuration so the test exercises the real URL rules and
 * the real ApiError contract.
 */
@WebMvcTest(EligibilityController.class)
@Import({EligibilityService.class, SecurityConfig.class, RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class, GlobalExceptionHandler.class, ClockConfig.class,
        EligibilityControllerTest.EnableSecurity.class})
class EligibilityControllerTest {

    /**
     * Boot 4's {@code @WebMvcTest} slice does not enable Spring Security's {@code HttpSecurity}
     * machinery by itself; this switches it on so the imported {@link SecurityConfig} (the real
     * URL rules) can build its filter chain.
     */
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
                  "hasCar": %2$b,
                  "hasExtraRealEstate": false,
                  "hasBusiness": false,
                  "marriedOrDivorcing": false,
                  "soldOrGiftedAssetsRecently": false,
                  "onlyConsumerDebts": true,
                  "hasForeignAssetsOrLawsuits": false,
                  "movedMoneyBeforeFiling": false,
                  "hasAlimonyDebt": false,
                  "hasLifeHealthHarmDebt": false,
                  "hasEconomicCriminalCase": false,
                  "guaranteedOthersDebt": false,
                  "incomeUnofficial": false,
                  "largeThirdPartyDeposits": false,
                  "manyCreditors": false,
                  "notReadyForCosts": false,
                  "preferredPath": "SELF_SERVICE"
                }
                """.formatted(debtRange, anyMarker);
    }

    @Test
    void fittingCaseIsOkAnonymously() throws Exception {
        mockMvc.perform(post("/api/v1/eligibility/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("FROM_350K_TO_3M", false)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("SELF_SERVICE_OK"))
                .andExpect(jsonPath("$.reasons").isEmpty());
    }

    @Test
    void smallDebtReturnsDebtTooSmall() throws Exception {
        mockMvc.perform(post("/api/v1/eligibility/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("UNDER_350K", false)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("DEBT_TOO_SMALL"))
                .andExpect(jsonPath("$.reasons").isEmpty());
    }

    @Test
    void complexCaseReturnsReasons() throws Exception {
        mockMvc.perform(post("/api/v1/eligibility/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("FROM_350K_TO_3M", true)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("NEEDS_LAWYER"))
                .andExpect(jsonPath("$.reasons[0]").isNotEmpty());
    }

    @Test
    void missingAnswerIsValidationError() throws Exception {
        mockMvc.perform(post("/api/v1/eligibility/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"debtRange\":\"FROM_350K_TO_3M\"}"))
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
