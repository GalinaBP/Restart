package ru.restart.app.payment.application;

public interface PaymentGateway {

    GatewayPayment create(PaymentOrder order);

    GatewayPayment fetch(String providerPaymentId);
}
