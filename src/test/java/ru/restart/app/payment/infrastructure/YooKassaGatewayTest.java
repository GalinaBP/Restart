package ru.restart.app.payment.infrastructure;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import ru.restart.app.payment.application.GatewayPayment;
import ru.restart.app.payment.application.PaymentOrder;
import ru.restart.app.payment.application.PaymentUnavailableException;
import ru.restart.app.payment.domain.PaymentStatus;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class YooKassaGatewayTest {

    private static final UUID PAYMENT_ID = UUID.fromString("2f6c3a1e-1111-4222-8333-944455556666");

    private HttpServer server;
    private final List<Recorded> requests = new CopyOnWriteArrayList<>();
    private volatile int answerStatus = 200;
    private volatile String answerBody = "{}";

    private record Recorded(String method, String path, String authorization, String idempotenceKey,
                            String body) {
    }

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v3/", this::answer);
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private void answer(HttpExchange exchange) throws IOException {
        requests.add(new Recorded(exchange.getRequestMethod(), exchange.getRequestURI().getPath(),
                exchange.getRequestHeaders().getFirst("Authorization"),
                exchange.getRequestHeaders().getFirst("Idempotence-Key"),
                new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8)));
        byte[] bytes = answerBody.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(answerStatus, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private YooKassaGateway gateway(boolean receipts) {
        return new YooKassaGateway(new YooKassaProperties("123456", "test_secret",
                "http://127.0.0.1:" + server.getAddress().getPort() + "/v3", receipts, 1));
    }

    private static PaymentOrder order() {
        return new PaymentOrder(PAYMENT_ID, new BigDecimal("1000.00"), "RUB", "Рестарт — доступ ко всему пути",
                "https://restart.example/pay/return?payment=" + PAYMENT_ID, "anna@mail.ru");
    }

    @Test
    void createSendsAnIdempotentRedirectPaymentWithShopCredentials() {
        answerBody = """
                {"id": "2ea1-yk", "status": "pending", "paid": false,
                 "amount": {"value": "1000.00", "currency": "RUB"},
                 "confirmation": {"type": "redirect", "confirmation_url": "https://yoomoney.ru/checkout/2ea1-yk"},
                 "test": true, "recipient": {"account_id": "123456"}}
                """;

        GatewayPayment created = gateway(false).create(order());

        assertThat(created.providerPaymentId()).isEqualTo("2ea1-yk");
        assertThat(created.status()).isEqualTo(PaymentStatus.PENDING);
        assertThat(created.confirmationUrl()).isEqualTo("https://yoomoney.ru/checkout/2ea1-yk");

        Recorded sent = requests.getFirst();
        assertThat(sent.method()).isEqualTo("POST");
        assertThat(sent.path()).isEqualTo("/v3/payments");
        assertThat(sent.idempotenceKey()).isEqualTo(PAYMENT_ID.toString());
        assertThat(sent.authorization()).isEqualTo("Basic "
                + Base64.getEncoder().encodeToString("123456:test_secret".getBytes(StandardCharsets.UTF_8)));
        assertThat(sent.body())
                .contains("\"amount\":{")
                .contains("\"value\":\"1000.00\"")
                .contains("\"currency\":\"RUB\"")
                .contains("\"capture\":true")
                .contains("\"return_url\":\"https://restart.example/pay/return?payment=" + PAYMENT_ID + "\"")
                .doesNotContain("receipt");
    }

    @Test
    void receiptIsAttachedWhenSwitchedOn() {
        answerBody = """
                {"id": "2ea1-yk", "status": "pending", "paid": false,
                 "amount": {"value": "1000.00", "currency": "RUB"},
                 "confirmation": {"type": "redirect", "confirmation_url": "https://yoomoney.ru/checkout/2ea1-yk"}}
                """;

        gateway(true).create(order());

        assertThat(requests.getFirst().body())
                .contains("\"receipt\":{")
                .contains("\"email\":\"anna@mail.ru\"")
                .contains("\"vat_code\":1")
                .contains("\"payment_subject\":\"service\"")
                .contains("\"payment_mode\":\"full_payment\"");
    }

    @Test
    void fetchReadsTheSettledPayment() {
        answerBody = """
                {"id": "2ea1-yk", "status": "succeeded", "paid": true,
                 "amount": {"value": "1000.00", "currency": "RUB"}}
                """;

        GatewayPayment fetched = gateway(false).fetch("2ea1-yk");

        assertThat(requests.getFirst().method()).isEqualTo("GET");
        assertThat(requests.getFirst().path()).isEqualTo("/v3/payments/2ea1-yk");
        assertThat(fetched.status()).isEqualTo(PaymentStatus.SUCCEEDED);
        assertThat(fetched.paid()).isTrue();
        assertThat(fetched.amount()).isEqualByComparingTo("1000.00");
        assertThat(fetched.currency()).isEqualTo("RUB");
    }

    @Test
    void canceledAndWaitingStatusesAreMapped() {
        answerBody = "{\"id\": \"a\", \"status\": \"canceled\", \"paid\": false}";
        assertThat(gateway(false).fetch("a").status()).isEqualTo(PaymentStatus.CANCELED);

        answerBody = "{\"id\": \"a\", \"status\": \"waiting_for_capture\", \"paid\": true}";
        assertThat(gateway(false).fetch("a").status()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void providerErrorBecomesPaymentUnavailable() {
        answerStatus = 401;
        answerBody = "{\"type\": \"error\", \"code\": \"invalid_credentials\"}";

        assertThatExceptionOfType(PaymentUnavailableException.class)
                .isThrownBy(() -> gateway(false).fetch("2ea1-yk"));
    }

    @Test
    void missingCredentialsFailFast() {
        assertThatExceptionOfType(IllegalStateException.class)
                .isThrownBy(() -> new YooKassaGateway(new YooKassaProperties("", "", "https://api.yookassa.ru/v3",
                        false, 1)));
    }
}
