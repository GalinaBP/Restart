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

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end data collection over real HTTP and MySQL (Data Collection → Case Management, per the
 * backlog's integration requirement): register → case → save a step → case moves to in_progress →
 * repeatable entries added and removed → resume state via the overview → stranger sees 404.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SectionFlowIntegrationTest extends AbstractIntegrationTest {

    private static String token;
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

    private ResponseEntity<Map> postJson(String path, String body, String bearer) {
        var spec = rest.post().uri(path).contentType(MediaType.APPLICATION_JSON).body(body);
        if (bearer != null) {
            spec = spec.header("Authorization", "Bearer " + bearer);
        }
        return spec.retrieve().toEntity(Map.class);
    }

    private ResponseEntity<Map> putJson(String path, String body, String bearer) {
        return rest.put().uri(path).contentType(MediaType.APPLICATION_JSON).body(body)
                .header("Authorization", "Bearer " + bearer)
                .retrieve().toEntity(Map.class);
    }

    @Test
    @Order(1)
    void savingAStepMovesTheCaseToInProgress() {
        token = (String) postJson("/api/v1/auth/register",
                "{\"email\": \"sections@mail.ru\", \"password\": \"sections-pass-1\"}", null)
                .getBody().get("accessToken");
        caseId = (String) postJson("/api/v1/cases", "{}", token).getBody().get("id");

        ResponseEntity<Map> saved = putJson("/api/v1/cases/" + caseId + "/sections/PASSPORT",
                "{\"series\": \"1234\", \"number\": \"567890\"}", token);
        assertThat(saved.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> current = rest.get().uri("/api/v1/cases/current")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(Map.class);
        assertThat(current.getBody()).containsEntry("status", "IN_PROGRESS");
    }

    @Test
    @Order(2)
    void repeatableEntriesAreAddedAndRemovedByResubmission() {
        putJson("/api/v1/cases/" + caseId + "/sections/CREDITORS",
                "[{\"name\": \"Банк А\"}, {\"name\": \"Банк Б\"}]", token);
        putJson("/api/v1/cases/" + caseId + "/sections/CREDITORS",
                "[{\"name\": \"Банк Б\"}]", token);

        ResponseEntity<Map> section = rest.get()
                .uri("/api/v1/cases/" + caseId + "/sections/CREDITORS")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(Map.class);

        List<Map<String, Object>> data = (List<Map<String, Object>>) section.getBody().get("data");
        assertThat(data).hasSize(1);
        assertThat(data.get(0)).containsEntry("name", "Банк Б");
    }

    @Test
    @Order(3)
    void overviewReflectsTheResumableState() {
        ResponseEntity<List> overview = rest.get()
                .uri("/api/v1/cases/" + caseId + "/sections")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(List.class);

        List<Map<String, Object>> body = (List<Map<String, Object>>) overview.getBody();
        assertThat(body).hasSize(23);
        assertThat(body.stream().filter(s -> (Boolean) s.get("filled")))
                .extracting(s -> s.get("key"))
                .containsExactlyInAnyOrder("PASSPORT", "CREDITORS");
    }

    @Test
    @Order(4)
    void unknownFieldIsRejected() {
        ResponseEntity<Map> response = putJson("/api/v1/cases/" + caseId + "/sections/PASSPORT",
                "{\"series\": \"1234\", \"favoriteColor\": \"violet\"}", token);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("code", "VALIDATION_ERROR");
    }

    @Test
    @Order(5)
    void strangerCannotTouchTheSections() {
        String stranger = (String) postJson("/api/v1/auth/register",
                "{\"email\": \"sections-stranger@mail.ru\", \"password\": \"sections-pass-1\"}",
                null).getBody().get("accessToken");

        ResponseEntity<Map> response = putJson("/api/v1/cases/" + caseId + "/sections/PASSPORT",
                "{\"series\": \"9999\"}", stranger);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
