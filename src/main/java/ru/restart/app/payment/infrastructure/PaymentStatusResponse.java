package ru.restart.app.payment.infrastructure;

import ru.restart.app.payment.domain.PaymentStatus;

public record PaymentStatusResponse(PaymentStatus status) {
}
