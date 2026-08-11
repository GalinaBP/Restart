package ru.restart.app.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;
import ru.restart.app.AbstractIntegrationTest;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthFlowIntegrationTest extends AbstractIntegrationTest {

    private static final String EMAIL = "it-user@mail.ru";
    private static final String PASSWORD = "integration-pass-1";

    private static String accessToken;
    private static String refreshToken;

    @LocalServerPort
    private int port;

    private RestClient rest;

    @BeforeEach
    void setUpClient() {
        rest = RestClient.builder()
                .baseUrl("http://localhost:" + port)
                .defaultStatusHandler(status -> true, (request, response) -> { })
                .build();
    }

    private static String credentials() {
        return """
                {"email": "%s", "password": "%s"}
                """.formatted(EMAIL, PASSWORD);
    }

    private ResponseEntity<Map> post(String path, String body) {
        return rest.post().uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toEntity(Map.class);
    }

    @Test
    @Order(1)
    void registerCreatesTheAccount() {
        ResponseEntity<Map> response = post("/api/v1/auth/register", credentials());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).containsKeys("accessToken", "refreshToken");
    }

    @Test
    @Order(2)
    void duplicateRegistrationIsRejected() {
        ResponseEntity<Map> response = post("/api/v1/auth/register", credentials());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("code", "EMAIL_ALREADY_REGISTERED");
    }

    @Test
    @Order(3)
    void loginIssuesTokens() {
        ResponseEntity<Map> response = post("/api/v1/auth/login", credentials());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        accessToken = (String) response.getBody().get("accessToken");
        refreshToken = (String) response.getBody().get("refreshToken");
        assertThat(accessToken).isNotBlank();
        assertThat(refreshToken).isNotBlank();
    }

    @Test
    @Order(4)
    void meReturnsTheAccountForTheAccessToken() {
        ResponseEntity<Map> response = rest.get().uri("/api/v1/auth/me")
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .toEntity(Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("email", EMAIL);
    }

    @Test
    @Order(5)
    void refreshRotatesTheTokenPair() {
        ResponseEntity<Map> response = post("/api/v1/auth/refresh",
                "{\"refreshToken\": \"" + refreshToken + "\"}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((String) response.getBody().get("accessToken")).isNotBlank();
    }

    @Test
    @Order(6)
    void meWithoutTokenIsUnauthorized() {
        ResponseEntity<Map> response = rest.get().uri("/api/v1/auth/me")
                .retrieve()
                .toEntity(Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
