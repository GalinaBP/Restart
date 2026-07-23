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
 * The backlog's AI-018 acceptance test: a full happy-path walk through the court procedure over
 * real HTTP and MySQL. Doubles as the regression the ticket asks for — the Document Builder keeps
 * working, and shows up in the journey as one stage of the larger procedure rather than a
 * standalone flow.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class JourneyFlowIntegrationTest extends AbstractIntegrationTest {

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

    @SuppressWarnings("unchecked")
    private Map<String, Object> journey() {
        ResponseEntity<Map> response = rest.get().uri("/api/v1/cases/" + caseId + "/journey")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> stage(Map<String, Object> journey, String key) {
        return ((List<Map<String, Object>>) journey.get("stages")).stream()
                .filter(s -> key.equals(s.get("stage")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("stage not in journey: " + key));
    }

    private ResponseEntity<Map> put(String path, String body) {
        return rest.put().uri(path)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve().toEntity(Map.class);
    }

    @Test
    @Order(1)
    void startACaseAndSeeTheCommonPath() {
        ResponseEntity<Map> registered = rest.post().uri("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\": \"journey-user@mail.ru\", \"password\": \"journey-pass-1\"}")
                .retrieve().toEntity(Map.class);
        token = (String) registered.getBody().get("accessToken");

        ResponseEntity<Map> created = rest.post().uri("/api/v1/cases")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(Map.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        caseId = (String) created.getBody().get("id");

        Map<String, Object> journey = journey();
        assertThat((List<?>) journey.get("stages")).hasSize(8);
        assertThat(journey.get("procedureType")).isNull();
        assertThat(journey.get("currentStage")).isEqualTo("DOCUMENT_PREPARATION");
        assertThat(stage(journey, "SCREENING")).containsEntry("status", "DONE");
    }

    @Test
    @Order(2)
    void fillingTheCaseMovesTheDocumentStageOnItsOwn() {
        CaseFixtures.VALID_SECTIONS.forEach((key, payload) -> {
            ResponseEntity<Map> saved = put(
                    "/api/v1/cases/" + caseId + "/sections/" + key.name(), payload);
            assertThat(saved.getStatusCode()).isEqualTo(HttpStatus.OK);
        });

        // Data collected but nothing generated yet — the stage reflects the case, unrecorded:
        assertThat(stage(journey(), "DOCUMENT_PREPARATION"))
                .containsEntry("status", "IN_PROGRESS")
                .containsEntry("editable", false);
    }

    @Test
    @Order(3)
    void generatingTheDocumentsCompletesThatStage() {
        // Generation answers with the list of rendered files, not a single object.
        ResponseEntity<List> generated = rest.post().uri("/api/v1/cases/" + caseId + "/documents")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(List.class);
        assertThat(generated.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(generated.getBody()).isNotEmpty();

        Map<String, Object> journey = journey();
        assertThat(stage(journey, "DOCUMENT_PREPARATION")).containsEntry("status", "DONE");
        assertThat(journey.get("currentStage")).isEqualTo("MANAGER_SELECTION");
    }

    @Test
    @Order(4)
    void derivedStagesRefuseToBeRecordedByHand() {
        ResponseEntity<Map> response = put(
                "/api/v1/cases/" + caseId + "/journey/DOCUMENT_PREPARATION",
                "{\"status\": \"NOT_STARTED\"}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("code", "INVALID_STATE");
    }

    @Test
    @Order(5)
    void payingIsRecordedAsDataAndTheFeesStageFollowsIt() {
        // The fixture pays only the duty, so the stage sits half-done until the deposit lands:
        assertThat(stage(journey(), "FEES_AND_DEPOSIT")).containsEntry("status", "IN_PROGRESS");

        put("/api/v1/cases/" + caseId + "/sections/PAYMENTS", """
                {"stateDutyPaidOn": "2026-07-20", "stateDutyReference": "чек № 4417",
                 "depositPaidOn": "2026-07-22", "depositReference": "платёжное поручение № 12"}""");

        assertThat(stage(journey(), "FEES_AND_DEPOSIT"))
                .containsEntry("status", "DONE")
                .containsEntry("editable", false);
    }

    @Test
    @Order(6)
    void walkTheRealWorldStagesUpToTheCourtDecision() {
        put("/api/v1/cases/" + caseId + "/journey/MANAGER_SELECTION",
                "{\"status\": \"DONE\", \"note\": \"СРО выбрана\"}");
        put("/api/v1/cases/" + caseId + "/journey/FILING",
                "{\"status\": \"DONE\", \"completedOn\": \"2026-07-23\"}");

        Map<String, Object> journey = journey();
        assertThat(journey.get("currentStage")).isEqualTo("COURT_DECISION");
        assertThat(stage(journey, "FILING")).containsEntry("completedOn", "2026-07-23");
        assertThat(stage(journey, "MANAGER_SELECTION")).containsEntry("note", "СРО выбрана");
    }

    @Test
    @Order(7)
    void theFeesEndpointExposesTheConfiguredAmounts() {
        ResponseEntity<Map> response = rest.get().uri("/api/v1/cases/" + caseId + "/fees")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsKeys("lines", "total", "allConfirmed");
        // Placeholder figures must announce themselves all the way to the client:
        assertThat(response.getBody().get("allConfirmed")).isEqualTo(false);
    }

    @Test
    @Order(8)
    void waitingOnTheCourtIsBlockedNotFailed() {
        put("/api/v1/cases/" + caseId + "/journey/COURT_DECISION",
                "{\"status\": \"BLOCKED\", \"note\": \"Заседание 12.08.2026\"}");

        Map<String, Object> journey = journey();
        assertThat(stage(journey, "COURT_DECISION")).containsEntry("status", "BLOCKED");
        assertThat(journey.get("currentStage")).isEqualTo("COURT_DECISION");
    }

    @Test
    @Order(9)
    void recordingTheCourtsProcedureOpensThatBranch() {
        ResponseEntity<Map> response = put(
                "/api/v1/cases/" + caseId + "/journey/procedure-type",
                "{\"procedureType\": \"REALIZATION\"}");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        Map<String, Object> journey = journey();
        assertThat(journey.get("procedureType")).isEqualTo("REALIZATION");
        assertThat((List<?>) journey.get("stages")).hasSize(9);
        assertThat(stage(journey, "PROPERTY_REALIZATION")).containsEntry("branch", "REALIZATION");
    }

    @Test
    @Order(10)
    void finishingEveryStageLeavesNoCurrentStage() {
        put("/api/v1/cases/" + caseId + "/journey/COURT_DECISION", "{\"status\": \"DONE\"}");
        put("/api/v1/cases/" + caseId + "/journey/PROPERTY_REALIZATION", "{\"status\": \"DONE\"}");
        put("/api/v1/cases/" + caseId + "/journey/CREDITOR_CLAIMS", "{\"status\": \"DONE\"}");
        ResponseEntity<Map> last = put("/api/v1/cases/" + caseId + "/journey/COMPLETION",
                "{\"status\": \"DONE\", \"completedOn\": \"2026-12-01\"}");

        assertThat(last.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(last.getBody().get("currentStage")).isNull();
    }

    @Test
    @Order(11)
    void theRecordedJourneySurvivesAReRead() {
        Map<String, Object> journey = journey();

        assertThat(stage(journey, "COMPLETION"))
                .containsEntry("status", "DONE")
                .containsEntry("completedOn", "2026-12-01");
        assertThat(stage(journey, "FILING")).containsEntry("completedOn", "2026-07-23");
    }
}
