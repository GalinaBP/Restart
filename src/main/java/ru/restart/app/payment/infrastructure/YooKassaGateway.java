package ru.restart.app.payment.infrastructure;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import ru.restart.app.payment.application.GatewayPayment;
import ru.restart.app.payment.application.PaymentGateway;
import ru.restart.app.payment.application.PaymentOrder;
import ru.restart.app.payment.application.PaymentUnavailableException;
import ru.restart.app.payment.domain.PaymentStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

class YooKassaGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(YooKassaGateway.class);

    private final RestClient client;
    private final YooKassaProperties properties;

    YooKassaGateway(YooKassaProperties properties) {
        if (isBlank(properties.shopId()) || isBlank(properties.secretKey()) || isBlank(properties.apiBase())) {
            throw new IllegalStateException(
                    "restart.payment.yookassa.shop-id, secret-key and api-base must be set when payments are enabled");
        }
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(20));
        this.client = RestClient.builder()
                .baseUrl(properties.apiBase())
                .requestFactory(requestFactory)
                .defaultHeaders(headers -> headers.setBasicAuth(properties.shopId(), properties.secretKey()))
                .build();
        this.properties = properties;
    }

    @Override
    public GatewayPayment create(PaymentOrder order) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", amount(order.amount(), order.currency()));
        body.put("capture", true);
        body.put("confirmation", Map.of("type", "redirect", "return_url", order.returnUrl()));
        body.put("description", order.description());
        body.put("metadata", Map.of("paymentId", order.paymentId().toString()));
        if (properties.receiptEnabled()) {
            body.put("receipt", receipt(order));
        }
        return call(() -> client.post()
                .uri("/payments")
                .header("Idempotence-Key", order.paymentId().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(YooKassaPayment.class));
    }

    @Override
    public GatewayPayment fetch(String providerPaymentId) {
        return call(() -> client.get()
                .uri("/payments/{id}", providerPaymentId)
                .retrieve()
                .body(YooKassaPayment.class));
    }

    private Map<String, Object> receipt(PaymentOrder order) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("description", order.description());
        item.put("quantity", "1.00");
        item.put("amount", amount(order.amount(), order.currency()));
        item.put("vat_code", properties.vatCode());
        item.put("payment_mode", "full_payment");
        item.put("payment_subject", "service");
        return Map.of(
                "customer", Map.of("email", order.customerEmail()),
                "items", List.of(item));
    }

    private static Map<String, String> amount(BigDecimal value, String currency) {
        return Map.of("value", value.setScale(2, RoundingMode.UNNECESSARY).toPlainString(),
                "currency", currency);
    }

    private GatewayPayment call(Supplier<YooKassaPayment> request) {
        try {
            YooKassaPayment payment = request.get();
            if (payment == null || isBlank(payment.id())) {
                log.error("YooKassa answered without a payment");
                throw new PaymentUnavailableException();
            }
            return payment.toGatewayPayment();
        } catch (RestClientResponseException ex) {
            log.error("YooKassa answered {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new PaymentUnavailableException();
        } catch (RestClientException ex) {
            log.error("YooKassa is unreachable", ex);
            throw new PaymentUnavailableException();
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record YooKassaPayment(String id, String status, boolean paid, Amount amount, Confirmation confirmation) {

        GatewayPayment toGatewayPayment() {
            return new GatewayPayment(id, mapStatus(status), paid,
                    amount == null ? null : new BigDecimal(amount.value()),
                    amount == null ? null : amount.currency(),
                    confirmation == null ? null : confirmation.confirmationUrl());
        }

        private static PaymentStatus mapStatus(String status) {
            return switch (status == null ? "" : status) {
                case "succeeded" -> PaymentStatus.SUCCEEDED;
                case "canceled" -> PaymentStatus.CANCELED;
                default -> PaymentStatus.PENDING;
            };
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Amount(String value, String currency) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Confirmation(String type, @JsonProperty("confirmation_url") String confirmationUrl) {
    }
}
