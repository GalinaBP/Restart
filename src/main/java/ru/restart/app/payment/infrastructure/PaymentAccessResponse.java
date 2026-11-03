package ru.restart.app.payment.infrastructure;

import ru.restart.app.payment.application.PaymentAccess;

import java.math.BigDecimal;

public record PaymentAccessResponse(boolean granted, BigDecimal price, String currency) {

    static PaymentAccessResponse from(PaymentAccess access) {
        return new PaymentAccessResponse(access.granted(), access.price(), access.currency());
    }
}
