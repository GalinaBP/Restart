package ru.restart.app.auth.infrastructure;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ru.restart.app.auth.application.AuthService;
import ru.restart.app.auth.application.PasswordResetService;
import ru.restart.app.auth.domain.UserAccountRepository;
import ru.restart.app.common.config.ClockConfig;
import ru.restart.app.common.error.GlobalExceptionHandler;
import ru.restart.app.common.security.RestAccessDeniedHandler;
import ru.restart.app.common.security.RestAuthenticationEntryPoint;
import ru.restart.app.common.security.SecurityConfig;
import ru.restart.app.common.security.SecurityContextCurrentUser;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The private-beta contract over HTTP: with registration switched off, sign-up answers a plain
 * 403 REGISTRATION_CLOSED (rendered as-is by the auth screen) — no account is created even by
 * calling the API directly.
 */
@WebMvcTest(AuthController.class)
@Import({AuthService.class, JwtTokenService.class, AuthSecurityConfig.class,
        SecurityContextCurrentUser.class, SecurityConfig.class, RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class, GlobalExceptionHandler.class, ClockConfig.class,
        RegistrationClosedControllerTest.EnableSecurity.class})
@TestPropertySource(properties = {
        "restart.registration.enabled=false",
        "app.security.jwt.access-secret=test-access-secret-0123456789-0123456789-0123456789",
        "app.security.jwt.refresh-secret=test-refresh-secret-0123456789-0123456789-0123456789",
        "app.security.jwt.access-token-ttl=PT15M",
        "app.security.jwt.refresh-token-ttl=P30D"
})
class RegistrationClosedControllerTest {

    /** See EligibilityControllerTest: Boot 4's web slice needs security switched on explicitly. */
    @TestConfiguration
    @EnableWebSecurity
    static class EnableSecurity {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserAccountRepository accounts;

    /** Not exercised here; mocked only so the controller's wiring resolves inside the slice. */
    @MockitoBean
    private PasswordResetService passwordReset;

    @Test
    void signUpIsRefusedWithThePlainRussianContract() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"new@mail.ru\", \"password\": \"correct-horse-1\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("REGISTRATION_CLOSED"))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("Регистрация пока закрыта")));
    }
}
