package ru.restart.app.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;
import ru.restart.app.AbstractIntegrationTest;
import ru.restart.app.auth.application.ResetLinkSender;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The forgot-password journey over real HTTP against a real MySQL: request a link (uniform 204
 * for known and unknown emails), spend the token once, and see the old password die and replays
 * bounce. The mailed link is captured through a recording {@link ResetLinkSender} standing in for
 * SMTP/logging delivery.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PasswordResetFlowIntegrationTest extends AbstractIntegrationTest {

    private static final String EMAIL = "reset-user@mail.ru";
    private static final String OLD_PASSWORD = "old-password-1";
    private static final String NEW_PASSWORD = "new-password-2";

    private static final List<String> SENT_LINKS = new CopyOnWriteArrayList<>();
    private static String resetToken;

    @TestConfiguration
    static class RecordingSenderConfig {

        @Bean
        @Primary
        ResetLinkSender recordingResetLinkSender() {
            return (email, resetLink) -> SENT_LINKS.add(resetLink);
        }
    }

    @LocalServerPort
    private int port;

    private RestClient rest;

    @BeforeEach
    void setUpClient() {
        rest = RestClient.builder()
                .baseUrl("http://localhost:" + port)
                // Assertions inspect the status themselves; 4xx must not throw.
                .defaultStatusHandler(status -> true, (request, response) -> { })
                .build();
    }

    private ResponseEntity<Map> post(String path, String body) {
        return rest.post().uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toEntity(Map.class);
    }

    private static String credentials(String password) {
        return """
                {"email": "%s", "password": "%s"}
                """.formatted(EMAIL, password);
    }

    @Test
    @Order(1)
    void registerTheAccount() {
        ResponseEntity<Map> response = post("/api/v1/auth/register", credentials(OLD_PASSWORD));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    @Order(2)
    void forgotPasswordMailsALink() {
        ResponseEntity<Map> response = post("/api/v1/auth/forgot-password",
                "{\"email\": \"" + EMAIL + "\"}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(SENT_LINKS).hasSize(1);
        String link = SENT_LINKS.getFirst();
        resetToken = link.substring(link.indexOf("token=") + "token=".length());
        assertThat(resetToken).isNotBlank();
    }

    @Test
    @Order(3)
    void unknownEmailGetsTheSame204ButNoLetter() {
        ResponseEntity<Map> response = post("/api/v1/auth/forgot-password",
                "{\"email\": \"nobody@mail.ru\"}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(SENT_LINKS).hasSize(1);
    }

    @Test
    @Order(4)
    void madeUpTokenIsRejectedWithTheUniformContract() {
        ResponseEntity<Map> response = post("/api/v1/auth/reset-password",
                "{\"token\": \"made-up\", \"password\": \"" + NEW_PASSWORD + "\"}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("code", "RESET_LINK_INVALID");
    }

    @Test
    @Order(5)
    void resetSwapsThePassword() {
        ResponseEntity<Map> response = post("/api/v1/auth/reset-password",
                "{\"token\": \"" + resetToken + "\", \"password\": \"" + NEW_PASSWORD + "\"}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(post("/api/v1/auth/login", credentials(OLD_PASSWORD)).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(post("/api/v1/auth/login", credentials(NEW_PASSWORD)).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    @Order(6)
    void spentTokenCannotBeReplayed() {
        ResponseEntity<Map> response = post("/api/v1/auth/reset-password",
                "{\"token\": \"" + resetToken + "\", \"password\": \"third-password-3\"}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("code", "RESET_LINK_INVALID");
    }
}
