package ru.restart.app.payment.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class Payment {

    private final UUID id;
    private final UUID userId;
    private final String providerPaymentId;
    private final BigDecimal amount;
    private final String currency;
    private final PaymentStatus status;
    private final Instant paidAt;

    public Payment(UUID id, UUID userId, String providerPaymentId, BigDecimal amount,
                   String currency, PaymentStatus status, Instant paidAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.userId = Objects.requireNonNull(userId, "userId");
        this.providerPaymentId = Objects.requireNonNull(providerPaymentId, "providerPaymentId");
        this.amount = Objects.requireNonNull(amount, "amount");
        this.currency = Objects.requireNonNull(currency, "currency");
        this.status = Objects.requireNonNull(status, "status");
        this.paidAt = paidAt;
    }

    public static Payment start(UUID id, UUID userId, String providerPaymentId, BigDecimal amount,
                                String currency) {
        return new Payment(id, userId, providerPaymentId, amount, currency, PaymentStatus.PENDING, null);
    }

    public boolean isPending() {
        return status == PaymentStatus.PENDING;
    }

    public boolean covers(BigDecimal reportedAmount, String reportedCurrency) {
        return reportedAmount != null && amount.compareTo(reportedAmount) == 0
                && currency.equals(reportedCurrency);
    }

    public Payment succeed(Instant at) {
        requirePending();
        return new Payment(id, userId, providerPaymentId, amount, currency, PaymentStatus.SUCCEEDED,
                Objects.requireNonNull(at, "at"));
    }

    public Payment cancel() {
        requirePending();
        return new Payment(id, userId, providerPaymentId, amount, currency, PaymentStatus.CANCELED, null);
    }

    private void requirePending() {
        if (!isPending()) {
            throw new IllegalStateException("Payment " + id + " is already " + status);
        }
    }

    public UUID id() {
        return id;
    }

    public UUID userId() {
        return userId;
    }

    public String providerPaymentId() {
        return providerPaymentId;
    }

    public BigDecimal amount() {
        return amount;
    }

    public String currency() {
        return currency;
    }

    public PaymentStatus status() {
        return status;
    }

    public Instant paidAt() {
        return paidAt;
    }
}
