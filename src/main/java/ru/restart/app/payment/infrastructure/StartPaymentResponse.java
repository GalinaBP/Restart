package ru.restart.app.payment.infrastructure;

import ru.restart.app.payment.application.StartedPayment;

import java.util.UUID;

public record StartPaymentResponse(UUID paymentId, String confirmationUrl) {

    static StartPaymentResponse from(StartedPayment started) {
        return new StartPaymentResponse(started.paymentId(), started.confirmationUrl());
    }
}
