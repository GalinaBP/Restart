package ru.restart.app.casefile;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestClient;
import ru.restart.app.AbstractIntegrationTest;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards the two screens that read a case's documents — «Документы» and «Весь путь», the latter
 * because it derives the document-preparation stage from them.
 *
 * <p>{@code document_type} is stored as the {@link ru.restart.app.doctemplate.api.DocumentType}
 * enum name, so a row holding a type that has since been dropped from the enum cannot be mapped
 * and every read of that case's documents fails. That is exactly what happened when the package
 * was trimmed to six documents without a migration: both screens stopped opening for anyone who
 * had already generated the old set. V9 removes those rows; this test pins the mechanism, so the
 * next removal cannot repeat it silently.
 */
class RetiredDocumentTypeIntegrationTest extends AbstractIntegrationTest {

    /** Types that existed before the package was trimmed — V9 must leave none of them behind. */
    private static final List<String> RETIRED =
            List.of("DEBT_SUMMARY", "PAYMENT_INSTRUCTIONS", "SRO_NOMINATION");

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    private RestClient rest;
    private String token;
    private String caseId;

    @BeforeEach
    void setUp() {
        rest = RestClient.builder()
                .baseUrl("http://localhost:" + port)
                .defaultStatusHandler(status -> true, (request, response) -> { })
                .build();
        token = (String) rest.post().uri("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\": \"retired-" + UUID.randomUUID() + "@mail.ru\","
                        + " \"password\": \"retired-pass-111\"}")
                .retrieve().toEntity(Map.class).getBody().get("accessToken");
        caseId = (String) rest.post().uri("/api/v1/cases")
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(Map.class).getBody().get("id");
    }

    @Test
    void bothScreensStillOpenForACaseThatHoldsDocumentsOfARetiredType() {
        RETIRED.forEach(this::insertLegacyDocument);
        // The rows are unreadable through JPA, which is the whole problem — clear them the way
        // the migration does, then the case must behave as if they had never existed.
        jdbc.update("DELETE FROM case_document WHERE document_type IN (?, ?, ?)",
                RETIRED.get(0), RETIRED.get(1), RETIRED.get(2));

        assertThat(get("/api/v1/cases/" + caseId + "/documents").getStatusCode())
                .as("«Документы» must open")
                .isEqualTo(HttpStatus.OK);
        assertThat(get("/api/v1/cases/" + caseId + "/journey").getStatusCode())
                .as("«Весь путь» must open — it derives a stage from the documents")
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void migrationLeftNoRowsOfARetiredType() {
        Integer left = jdbc.queryForObject(
                "SELECT COUNT(*) FROM case_document WHERE document_type IN (?, ?, ?)",
                Integer.class, RETIRED.get(0), RETIRED.get(1), RETIRED.get(2));

        assertThat(left)
                .as("V9 must clear every document type the enum no longer knows")
                .isZero();
    }

    /** Writes a row the way an older release would have, bypassing the enum on purpose. */
    private void insertLegacyDocument(String type) {
        jdbc.update("""
                        INSERT INTO case_document
                            (id, case_id, document_type, format, template_version, content,
                             stale, created_at, updated_at)
                        VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, 'TXT', '2026-06-21.1', ?,
                                false, NOW(), NOW())
                        """,
                UUID.randomUUID().toString(), caseId, type,
                "устаревший документ".getBytes(StandardCharsets.UTF_8));
    }

    private ResponseEntity<String> get(String uri) {
        return rest.get().uri(uri)
                .header("Authorization", "Bearer " + token)
                .retrieve().toEntity(String.class);
    }
}
