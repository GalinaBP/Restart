package ru.restart.app.payment.application;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentOrder(
        UUID paymentId,
        BigDecimal amount,
        String currency,
        String description,
        String returnUrl,
        String customerEmail) {
}
