package ru.restart.app.payment.infrastructure;

import org.springframework.stereotype.Component;
import ru.restart.app.payment.domain.Payment;
import ru.restart.app.payment.domain.PaymentRepository;
import ru.restart.app.payment.domain.PaymentStatus;

import java.util.Optional;
import java.util.UUID;

@Component
class PaymentRepositoryAdapter implements PaymentRepository {

    private final PaymentJpaRepository jpa;

    PaymentRepositoryAdapter(PaymentJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public Payment save(Payment payment) {
        PaymentEntity entity = jpa.findById(payment.id())
                .map(existing -> {
                    existing.update(payment.status(), payment.paidAt());
                    return existing;
                })
                .orElseGet(() -> new PaymentEntity(payment.id(), payment.userId(),
                        payment.providerPaymentId(), payment.amount(), payment.currency(),
                        payment.status(), payment.paidAt()));
        return toDomain(jpa.save(entity));
    }

    @Override
    public Optional<Payment> findById(UUID id) {
        return jpa.findById(id).map(this::toDomain);
    }

    @Override
    public Optional<Payment> findByProviderPaymentId(String providerPaymentId) {
        return jpa.findByProviderPaymentId(providerPaymentId).map(this::toDomain);
    }

    @Override
    public boolean existsSucceededForUser(UUID userId) {
        return jpa.existsByUserIdAndStatus(userId, PaymentStatus.SUCCEEDED);
    }

    private Payment toDomain(PaymentEntity entity) {
        return new Payment(entity.getId(), entity.getUserId(), entity.getProviderPaymentId(),
                entity.getAmount(), entity.getCurrency(), entity.getStatus(), entity.getPaidAt());
    }
}
