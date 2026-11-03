package ru.restart.app.payment.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.restart.app.payment.domain.PaymentStatus;

import java.util.Optional;
import java.util.UUID;

interface PaymentJpaRepository extends JpaRepository<PaymentEntity, UUID> {

    Optional<PaymentEntity> findByProviderPaymentId(String providerPaymentId);

    boolean existsByUserIdAndStatus(UUID userId, PaymentStatus status);
}
