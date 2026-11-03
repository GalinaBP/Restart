package ru.restart.app.payment;

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
import ru.restart.app.payment.application.GatewayPayment;
import ru.restart.app.payment.application.PaymentGateway;
import ru.restart.app.payment.application.PaymentOrder;
import ru.restart.app.payment.domain.PaymentStatus;

import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PaymentFlowIntegrationTest extends AbstractIntegrationTest {

    private static final Map<String, PaymentStatus> PROVIDER = new ConcurrentHashMap<>();
    private static String accessToken;
    private static String otherAccessToken;
    private static String paymentId;
    private static String providerPaymentId;

    @TestConfiguration
    static class FakeYooKassa {

        @Bean
        @Primary
        PaymentGateway fakeYooKassaGateway() {
            return new PaymentGateway() {
                @Override
                public GatewayPayment create(PaymentOrder order) {
                    String id = "yk-" + order.paymentId();
                    PROVIDER.put(id, PaymentStatus.PENDING);
                    return new GatewayPayment(id, PaymentStatus.PENDING, false, order.amount(),
                            order.currency(), "https://yoomoney.ru/checkout/" + id);
                }

                @Override
                public GatewayPayment fetch(String providerPaymentId) {
                    PaymentStatus status = PROVIDER.get(providerPaymentId);
                    return new GatewayPayment(providerPaymentId, status, status == PaymentStatus.SUCCEEDED,
                            new BigDecimal("1000.00"), "RUB", null);
                }
            };
        }
    }

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

    private ResponseEntity<Map> call(String method, String path, String token, String body) {
        RestClient.RequestBodySpec spec = rest.method(org.springframework.http.HttpMethod.valueOf(method)).uri(path);
        if (token != null) {
            spec = spec.header("Authorization", "Bearer " + token);
        }
        if (body != null) {
            spec = spec.contentType(MediaType.APPLICATION_JSON).body(body);
        }
        return spec.retrieve().toEntity(Map.class);
    }

    private String register(String email) {
        ResponseEntity<Map> response = call("POST", "/api/v1/auth/register", null,
                "{\"email\": \"" + email + "\", \"password\": \"correct-horse-1\"}");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return (String) response.getBody().get("accessToken");
    }

    @Test
    @Order(1)
    void newAccountHasNoAccessAndSeesThePrice() {
        accessToken = register("payer@mail.ru");
        otherAccessToken = register("other-payer@mail.ru");

        ResponseEntity<Map> response = call("GET", "/api/v1/payments/access", accessToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("granted", false).containsEntry("currency", "RUB");
        assertThat(new BigDecimal(response.getBody().get("price").toString())).isEqualByComparingTo("1000");
    }

    @Test
    @Order(2)
    void accessNeedsSignIn() {
        assertThat(call("GET", "/api/v1/payments/access", null, null).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(call("POST", "/api/v1/payments", null, null).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @Order(3)
    void startReturnsTheCheckoutUrl() {
        ResponseEntity<Map> response = call("POST", "/api/v1/payments", accessToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        paymentId = (String) response.getBody().get("paymentId");
        providerPaymentId = "yk-" + paymentId;
        assertThat(response.getBody()).containsEntry("confirmationUrl",
                "https://yoomoney.ru/checkout/" + providerPaymentId);
        assertThat(call("GET", "/api/v1/payments/" + paymentId, accessToken, null).getBody())
                .containsEntry("status", "PENDING");
    }

    @Test
    @Order(4)
    void anotherAccountCannotSeeThePayment() {
        assertThat(call("GET", "/api/v1/payments/" + paymentId, otherAccessToken, null).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @Order(5)
    void webhookIsPublicAndSettlesThePaymentFromTheProvider() {
        PROVIDER.put(providerPaymentId, PaymentStatus.SUCCEEDED);

        ResponseEntity<Map> response = call("POST", "/api/v1/payments/yookassa/notifications", null, """
                {"type": "notification", "event": "payment.succeeded",
                 "object": {"id": "%s", "status": "succeeded", "paid": true}}
                """.formatted(providerPaymentId));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(call("GET", "/api/v1/payments/access", accessToken, null).getBody())
                .containsEntry("granted", true);
        assertThat(call("GET", "/api/v1/payments/access", otherAccessToken, null).getBody())
                .containsEntry("granted", false);
    }

    @Test
    @Order(6)
    void paidAccountIsNotChargedAgain() {
        ResponseEntity<Map> response = call("POST", "/api/v1/payments", accessToken, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("code", "ACCESS_ALREADY_GRANTED");
    }

    @Test
    @Order(7)
    void webhookForAnUnknownPaymentIsAcknowledged() {
        ResponseEntity<Map> response = call("POST", "/api/v1/payments/yookassa/notifications", null,
                "{\"event\": \"payment.succeeded\", \"object\": {\"id\": \"made-up\"}}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
