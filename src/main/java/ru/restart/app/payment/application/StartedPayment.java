package ru.restart.app.payment.application;

import java.util.UUID;

public record StartedPayment(UUID paymentId, String confirmationUrl) {
}
