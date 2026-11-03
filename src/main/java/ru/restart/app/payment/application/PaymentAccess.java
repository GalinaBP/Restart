package ru.restart.app.payment.application;

import java.math.BigDecimal;

public record PaymentAccess(boolean granted, BigDecimal price, String currency) {
}
