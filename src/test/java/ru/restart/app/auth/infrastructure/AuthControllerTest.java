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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.context.annotation.Bean;
import ru.restart.app.auth.application.AuthService;
import ru.restart.app.auth.application.PasswordResetService;
import ru.restart.app.auth.application.ResetLinkSender;
import ru.restart.app.auth.domain.PasswordResetTokenRepository;
import ru.restart.app.auth.domain.UserAccount;
import ru.restart.app.auth.domain.UserAccountRepository;
import ru.restart.app.auth.domain.UserRole;
import ru.restart.app.common.config.ClockConfig;
import ru.restart.app.common.error.GlobalExceptionHandler;
import ru.restart.app.common.security.RestAccessDeniedHandler;
import ru.restart.app.common.security.RestAuthenticationEntryPoint;
import ru.restart.app.common.security.SecurityConfig;
import ru.restart.app.common.security.SecurityContextCurrentUser;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-slice test with the real security chain, real JWT service, and real use cases — only the
 * repository is mocked. Verifies the API contract: status codes, ApiError shape, and that the JWT
 * filter authenticates {@code /auth/me}.
 */
@WebMvcTest(AuthController.class)
@Import({AuthService.class, PasswordResetService.class, JwtTokenService.class,
        AuthSecurityConfig.class,
        SecurityContextCurrentUser.class, SecurityConfig.class, RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class, GlobalExceptionHandler.class, ClockConfig.class,
        AuthControllerTest.EnableSecurity.class})
@TestPropertySource(properties = {
        "app.security.jwt.access-secret=test-access-secret-0123456789-0123456789-0123456789",
        "app.security.jwt.refresh-secret=test-refresh-secret-0123456789-0123456789-0123456789",
        "app.security.jwt.access-token-ttl=PT15M",
        "app.security.jwt.refresh-token-ttl=P30D"
})
class AuthControllerTest {

    /** See EligibilityControllerTest: Boot 4's web slice needs security switched on explicitly. */
    @TestConfiguration
    @EnableWebSecurity
    static class EnableSecurity {

        /** Stands in for the SMTP/logging delivery beans that live outside the slice. */
        @Bean
        ResetLinkSender noOpResetLinkSender() {
            return (email, resetLink) -> { };
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserAccountRepository accounts;

    @MockitoBean
    private PasswordResetTokenRepository resetTokens;

    private static String credentials(String email, String password) {
        return """
                {"email": "%s", "password": "%s"}
                """.formatted(email, password);
    }

    @Test
    void registerReturnsTokenPair() throws Exception {
        when(accounts.existsByEmail("new@mail.ru")).thenReturn(false);
        when(accounts.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials("new@mail.ru", "correct-horse-1")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresInSeconds").value(900));
    }

    @Test
    void registerConflictsOnKnownEmail() throws Exception {
        when(accounts.existsByEmail("taken@mail.ru")).thenReturn(true);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials("taken@mail.ru", "correct-horse-1")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_REGISTERED"));
    }

    @Test
    void registerValidatesEmailAndPasswordLength() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials("not-an-email", "short")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors").isNotEmpty());
    }

    @Test
    void loginFailureIsUniform401() throws Exception {
        when(accounts.findByEmail("nobody@mail.ru")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials("nobody@mail.ru", "whatever-123")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"));
    }

    @Test
    void forgotPasswordAnswers204EvenForUnknownEmail() throws Exception {
        when(accounts.findByEmail("nobody@mail.ru")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"nobody@mail.ru\"}"))
                .andExpect(status().isNoContent());
    }

    @Test
    void resetPasswordRejectsABadTokenWithTheUniformContract() throws Exception {
        when(resetTokens.findByTokenHash(any())).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"made-up\", \"password\": \"new-password-2\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("RESET_LINK_INVALID"));
    }

    @Test
    void resetPasswordValidatesThePasswordRules() throws Exception {
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"some-token\", \"password\": \"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors").isNotEmpty());
    }

    @Test
    void meWithoutTokenIs401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"));
    }

    @Test
    void accessTokenFromRegisterAuthenticatesMe() throws Exception {
        UserAccount[] saved = new UserAccount[1];
        when(accounts.existsByEmail("flow@mail.ru")).thenReturn(false);
        when(accounts.save(any())).thenAnswer(invocation -> {
            saved[0] = invocation.getArgument(0);
            return saved[0];
        });

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials("flow@mail.ru", "correct-horse-1")))
                .andExpect(status().isCreated())
                .andReturn();

        String accessToken = com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.accessToken");
        when(accounts.findById(saved[0].id())).thenReturn(Optional.of(saved[0]));

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(saved[0].id().toString()))
                .andExpect(jsonPath("$.email").value("flow@mail.ru"))
                .andExpect(jsonPath("$.role").value(UserRole.USER.name()));
    }
}
