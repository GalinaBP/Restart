package ru.restart.app.payment.domain;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository {

    Payment save(Payment payment);

    Optional<Payment> findById(UUID id);

    Optional<Payment> findByProviderPaymentId(String providerPaymentId);

    boolean existsSucceededForUser(UUID userId);
}
