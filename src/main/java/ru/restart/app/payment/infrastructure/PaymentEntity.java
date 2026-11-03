package ru.restart.app.payment.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import ru.restart.app.common.persistence.BaseEntity;
import ru.restart.app.payment.domain.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment")
public class PaymentEntity extends BaseEntity {

    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Column(name = "provider_payment_id", nullable = false, length = 64)
    private String providerPaymentId;

    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3, columnDefinition = "CHAR(3)")
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private PaymentStatus status;

    @Column(name = "paid_at")
    private Instant paidAt;

    protected PaymentEntity() {
    }

    PaymentEntity(UUID id, UUID userId, String providerPaymentId, BigDecimal amount, String currency,
                  PaymentStatus status, Instant paidAt) {
        this.id = id;
        this.userId = userId;
        this.providerPaymentId = providerPaymentId;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
        this.paidAt = paidAt;
    }

    void update(PaymentStatus status, Instant paidAt) {
        this.status = status;
        this.paidAt = paidAt;
    }

    UUID getId() {
        return id;
    }

    UUID getUserId() {
        return userId;
    }

    String getProviderPaymentId() {
        return providerPaymentId;
    }

    BigDecimal getAmount() {
        return amount;
    }

    String getCurrency() {
        return currency;
    }

    PaymentStatus getStatus() {
        return status;
    }

    Instant getPaidAt() {
        return paidAt;
    }
}
