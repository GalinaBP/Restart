package ru.restart.app.casefile;

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

/**
 * End-to-end case lifecycle over real HTTP and MySQL, exercising the Case Management → User
 * Profile linkage the backlog asks for: register → create case (draft) → duplicate rejected →
 * retrieve by id/current → a second user cannot see it.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class CaseFlowIntegrationTest extends AbstractIntegrationTest {

    private static String ownerToken;
    private static String strangerToken;
    private static String caseId;

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

    private String register(String email) {
        ResponseEntity<Map> response = rest.post().uri("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\": \"" + email + "\", \"password\": \"case-flow-pass-1\"}")
                .retrieve()
                .toEntity(Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return (String) response.getBody().get("accessToken");
    }

    private ResponseEntity<Map> withToken(String token, String method, String path) {
        var spec = method.equals("POST") ? rest.post().uri(path) : rest.get().uri(path);
        return spec.header("Authorization", "Bearer " + token).retrieve().toEntity(Map.class);
    }

    @Test
    @Order(1)
    void createCaseStartsAsDraftLinkedToTheUser() {
        ownerToken = register("case-owner@mail.ru");

        ResponseEntity<Map> response = withToken(ownerToken, "POST", "/api/v1/cases");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).containsEntry("status", "DRAFT");
        caseId = (String) response.getBody().get("id");
        assertThat(caseId).isNotBlank();
    }

    @Test
    @Order(2)
    void secondActiveCaseIsRejected() {
        ResponseEntity<Map> response = withToken(ownerToken, "POST", "/api/v1/cases");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("code", "INVALID_STATE");
    }

    @Test
    @Order(3)
    void caseIsRetrievableByIdAndAsCurrent() {
        ResponseEntity<Map> byId = withToken(ownerToken, "GET", "/api/v1/cases/" + caseId);
        ResponseEntity<Map> current = withToken(ownerToken, "GET", "/api/v1/cases/current");

        assertThat(byId.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(byId.getBody()).containsEntry("id", caseId);
        assertThat(current.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(current.getBody()).containsEntry("id", caseId);
    }

    @Test
    @Order(4)
    void anotherUserCannotSeeTheCase() {
        strangerToken = register("case-stranger@mail.ru");

        ResponseEntity<Map> response = withToken(strangerToken, "GET", "/api/v1/cases/" + caseId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @Order(5)
    void anonymousAccessIsRejected() {
        ResponseEntity<Map> response = rest.post().uri("/api/v1/cases")
                .retrieve()
                .toEntity(Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
