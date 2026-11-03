package ru.restart.app.payment.application;

import ru.restart.app.payment.domain.PaymentStatus;

import java.math.BigDecimal;

public record GatewayPayment(
        String providerPaymentId,
        PaymentStatus status,
        boolean paid,
        BigDecimal amount,
        String currency,
        String confirmationUrl) {
}
