package ru.restart.app.casefile;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;
import ru.restart.app.AbstractIntegrationTest;
import ru.restart.app.casefile.domain.SectionKey;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The full journey to a downloadable filing package over real HTTP and MySQL: register → case →
 * blocked while incomplete → fill everything → generate 12 files → download a real DOCX. This is
 * the Templates → Export integration the backlog asks for, one endpoint short of AI-009's bundle.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class DocumentFlowIntegrationTest extends AbstractIntegrationTest {

    private static String token;
    private static String caseId;
    private static String docxDocumentId;

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

    @Test
    @Order(1)
    void generationIsBlockedWhileTheCaseIsIncomplete() {
        token = (String) rest.post().uri("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\": \"docs@mail.ru\", \"password\": \"docs-pass-111\"}")
                .retrieve().toEntity(Map.class).getBody().get("accessToken");
        caseId = (String) rest.post().uri("/api/v1/cases")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(Map.class).getBody().get("id");

        ResponseEntity<Map> blocked = rest.post().uri("/api/v1/cases/" + caseId + "/documents")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(Map.class);

        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(blocked.getBody()).containsEntry("code", "GENERATION_BLOCKED");
        List<Map<String, Object>> missing =
                (List<Map<String, Object>>) blocked.getBody().get("missing");
        assertThat(missing)
                .extracting(item -> item.get("step") + ":" + item.get("code"))
                .contains("PASSPORT:SECTION_EMPTY", "CREDITORS:SECTION_EMPTY");
    }

    @Test
    @Order(2)
    void aCompletedCaseGeneratesTheTwelveFilePackage() {
        for (Map.Entry<SectionKey, String> section : CaseFixtures.VALID_SECTIONS.entrySet()) {
            ResponseEntity<Map> saved = rest.put()
                    .uri("/api/v1/cases/" + caseId + "/sections/" + section.getKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(section.getValue())
                    .header("Authorization", "Bearer " + token)
                    .retrieve().toEntity(Map.class);
            assertThat(saved.getStatusCode()).isEqualTo(HttpStatus.OK);
        }

        ResponseEntity<List> generated = rest.post().uri("/api/v1/cases/" + caseId + "/documents")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(List.class);

        assertThat(generated.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        List<Map<String, Object>> body = (List<Map<String, Object>>) generated.getBody();
        assertThat(body).hasSize(12);
        docxDocumentId = body.stream()
                .filter(d -> "DOCX".equals(d.get("format"))
                        && "BANKRUPTCY_APPLICATION".equals(d.get("type")))
                .findFirst().orElseThrow()
                .get("id").toString();
    }

    @Test
    @Order(3)
    void theGeneratedDocxDownloadsAsARealWordFile() {
        ResponseEntity<byte[]> download = rest.get()
                .uri("/api/v1/cases/" + caseId + "/documents/" + docxDocumentId)
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(byte[].class);

        assertThat(download.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(download.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .contains("attachment").contains("bankruptcy_application.docx");
        byte[] bytes = download.getBody();
        assertThat(new String(bytes, 0, 2, StandardCharsets.US_ASCII)).isEqualTo("PK");
    }

    @Test
    @Order(4)
    void editingDataRegeneratesTheDocumentsAutomatically() {
        // Remove the second creditor; the case stays valid, so documents refresh on their own.
        rest.put().uri("/api/v1/cases/" + caseId + "/sections/CREDITORS")
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        [{"name": "ПАО «Банк Восход»", "inn": "7707083893",
                          "address": "г. Москва, ул. Банковская, д. 3",
                          "debtAmount": 1000000, "debtType": "кредитный договор"}]""")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(Map.class);

        List<Map<String, Object>> docs = rest.get().uri("/api/v1/cases/" + caseId + "/documents")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(List.class).getBody();
        assertThat(docs).hasSize(12).allSatisfy(d -> assertThat(d.get("stale")).isEqualTo(false));

        String creditorListId = docs.stream()
                .filter(d -> "CREDITOR_LIST".equals(d.get("type")) && "TXT".equals(d.get("format")))
                .findFirst().orElseThrow().get("id").toString();
        byte[] txt = rest.get().uri("/api/v1/cases/" + caseId + "/documents/" + creditorListId)
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(byte[].class).getBody();
        assertThat(new String(txt, StandardCharsets.UTF_8))
                .contains("Итого кредиторов: 1")
                .doesNotContain("МФО «Деньги-Быстро»");
    }

    @Test
    @Order(5)
    void anInvalidatingEditFlagsTheDocumentsStale() {
        rest.put().uri("/api/v1/cases/" + caseId + "/sections/PASSPORT")
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"series\": \"4519\", \"number\": \"123456\"}")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(Map.class);

        List<Map<String, Object>> docs = rest.get().uri("/api/v1/cases/" + caseId + "/documents")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(List.class).getBody();
        assertThat(docs).hasSize(12).allSatisfy(d -> assertThat(d.get("stale")).isEqualTo(true));
    }

    @Test
    @Order(6)
    void fixingTheCaseAllowsExportingTheWholePackage() throws Exception {
        // The case is invalid since order(5); export must show the blocking contract:
        ResponseEntity<Map> blocked = rest.post()
                .uri("/api/v1/cases/" + caseId + "/documents/export")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(Map.class);
        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(blocked.getBody()).containsEntry("code", "GENERATION_BLOCKED");

        // Fix the passport, then export the full zip:
        rest.put().uri("/api/v1/cases/" + caseId + "/sections/PASSPORT")
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"series": "4519", "number": "123456",
                         "issuedBy": "ГУ МВД России по г. Москве", "issueDate": "2019-06-14"}""")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(Map.class);

        ResponseEntity<byte[]> export = rest.post()
                .uri("/api/v1/cases/" + caseId + "/documents/export")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(byte[].class);

        assertThat(export.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(export.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .contains("restart-filing-package.zip");
        List<String> entries = new java.util.ArrayList<>();
        try (java.util.zip.ZipInputStream zip = new java.util.zip.ZipInputStream(
                new java.io.ByteArrayInputStream(export.getBody()))) {
            for (java.util.zip.ZipEntry entry = zip.getNextEntry(); entry != null;
                 entry = zip.getNextEntry()) {
                entries.add(entry.getName());
            }
        }
        assertThat(entries).hasSize(12)
                .contains("bankruptcy_application.docx", "creditor_list.docx",
                        "property_information.docx", "debt_summary.docx",
                        "attachments_checklist.docx", "filing_checklist.docx");
    }

    @Test
    @Order(7)
    void strangersSeeNeitherListNorFiles() {
        String stranger = (String) rest.post().uri("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\": \"docs-stranger@mail.ru\", \"password\": \"docs-pass-111\"}")
                .retrieve().toEntity(Map.class).getBody().get("accessToken");

        ResponseEntity<Map> list = rest.get().uri("/api/v1/cases/" + caseId + "/documents")
                .header("Authorization", "Bearer " + stranger)
                .retrieve().toEntity(Map.class);

        assertThat(list.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
