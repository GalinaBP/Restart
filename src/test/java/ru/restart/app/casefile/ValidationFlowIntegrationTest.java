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

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ValidationFlowIntegrationTest extends AbstractIntegrationTest {

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

    private ResponseEntity<Map> send(String method, String path, String body, String bearer) {
        var spec = switch (method) {
            case "POST" -> rest.post().uri(path).contentType(MediaType.APPLICATION_JSON).body(body);
            case "PUT" -> rest.put().uri(path).contentType(MediaType.APPLICATION_JSON).body(body);
            default -> rest.get().uri(path);
        };
        if (bearer != null) {
            spec = spec.header("Authorization", "Bearer " + bearer);
        }
        return spec.retrieve().toEntity(Map.class);
    }

    @Test
    @Order(1)
    void savingMalformedDataReportsIssuesButIsNotBlocked() {
        token = (String) send("POST", "/api/v1/auth/register",
                "{\"email\": \"validation@mail.ru\", \"password\": \"validation-pass-1\"}", null)
                .getBody().get("accessToken");
        caseId = (String) send("POST", "/api/v1/cases", "{}", token).getBody().get("id");

        ResponseEntity<Map> saved = send("PUT", "/api/v1/cases/" + caseId + "/sections/PASSPORT",
                "{\"series\": \"12\", \"number\": \"567890\"}", token);

        assertThat(saved.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<Map<String, Object>> issues = (List<Map<String, Object>>) saved.getBody().get("issues");
        assertThat(issues)
                .extracting(i -> i.get("field") + ":" + i.get("code"))
                .contains("series:INVALID_PASSPORT_SERIES",
                        "issuedBy:REQUIRED_FIELD_MISSING",
                        "issueDate:REQUIRED_FIELD_MISSING");
    }

    @Test
    @Order(2)
    void wholeCaseReportAggregatesAllSections() {
        ResponseEntity<Map> report = send("GET", "/api/v1/cases/" + caseId + "/validation",
                null, token);

        assertThat(report.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(report.getBody()).containsEntry("valid", false);
        List<Map<String, Object>> issues = (List<Map<String, Object>>) report.getBody().get("issues");
        assertThat(issues)
                .extracting(i -> i.get("section") + ":" + i.get("code"))
                .contains("PASSPORT:INVALID_PASSPORT_SERIES", "CREDITORS:SECTION_EMPTY")
                .doesNotContain("VEHICLES:SECTION_EMPTY");
    }

    @Test
    @Order(3)
    void fixingTheDataClearsItsIssues() {
        ResponseEntity<Map> saved = send("PUT", "/api/v1/cases/" + caseId + "/sections/PASSPORT",
                "{\"series\": \"1234\", \"number\": \"567890\", \"issuedBy\": \"МВД России\", "
                        + "\"issueDate\": \"2019-03-01\"}", token);
        assertThat((List<?>) saved.getBody().get("issues")).isEmpty();

        ResponseEntity<Map> report = send("GET", "/api/v1/cases/" + caseId + "/validation",
                null, token);
        List<Map<String, Object>> issues = (List<Map<String, Object>>) report.getBody().get("issues");
        assertThat(issues)
                .extracting(i -> (String) i.get("section"))
                .doesNotContain("PASSPORT");
    }
}
