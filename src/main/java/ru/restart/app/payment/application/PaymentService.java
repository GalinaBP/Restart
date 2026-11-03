package ru.restart.app.payment.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.restart.app.common.error.ResourceNotFoundException;
import ru.restart.app.common.security.AuthenticatedUser;
import ru.restart.app.common.security.CurrentUser;
import ru.restart.app.payment.domain.Payment;
import ru.restart.app.payment.domain.PaymentRepository;
import ru.restart.app.payment.domain.PaymentStatus;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    static final String CURRENCY = "RUB";
    static final String DESCRIPTION = "Рестарт — доступ ко всему пути";

    private final PaymentRepository payments;
    private final PaymentGateway gateway;
    private final CurrentUser currentUser;
    private final Clock clock;
    private final boolean enabled;
    private final BigDecimal price;
    private final String returnBase;

    public PaymentService(PaymentRepository payments, PaymentGateway gateway, CurrentUser currentUser,
                          Clock clock,
                          @Value("${restart.payment.enabled:false}") boolean enabled,
                          @Value("${restart.payment.price:1000.00}") BigDecimal price,
                          @Value("${restart.reset.link-base-url:}") String frontendBaseUrl,
                          @Value("${app.cors.allowed-origins:}") String corsOrigins) {
        this.payments = payments;
        this.gateway = gateway;
        this.currentUser = currentUser;
        this.clock = clock;
        this.enabled = enabled;
        this.price = price.setScale(2);
        this.returnBase = resolveBase(frontendBaseUrl, corsOrigins);
    }

    @Transactional(readOnly = true)
    public PaymentAccess access() {
        UUID userId = currentUser.require().userId();
        boolean granted = !enabled || payments.existsSucceededForUser(userId);
        return new PaymentAccess(granted, price, CURRENCY);
    }

    public StartedPayment start() {
        AuthenticatedUser user = currentUser.require();
        if (!enabled || payments.existsSucceededForUser(user.userId())) {
            throw new AccessAlreadyGrantedException();
        }
        UUID paymentId = UUID.randomUUID();
        GatewayPayment created = gateway.create(new PaymentOrder(paymentId, price, CURRENCY, DESCRIPTION,
                returnBase + "/pay/return?payment=" + paymentId, user.email()));
        payments.save(Payment.start(paymentId, user.userId(), created.providerPaymentId(), price, CURRENCY));
        return new StartedPayment(paymentId, created.confirmationUrl());
    }

    public PaymentStatus status(UUID paymentId) {
        UUID userId = currentUser.require().userId();
        Payment payment = payments.findById(paymentId)
                .filter(p -> p.userId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Такой оплаты не нашлось"));
        return payment.isPending() ? sync(payment).status() : payment.status();
    }

    public void handleNotification(String providerPaymentId) {
        payments.findByProviderPaymentId(providerPaymentId)
                .filter(Payment::isPending)
                .ifPresentOrElse(this::sync,
                        () -> log.debug("Notification for unknown or settled payment {}", providerPaymentId));
    }

    private Payment sync(Payment payment) {
        GatewayPayment reported = gateway.fetch(payment.providerPaymentId());
        Payment settled = switch (reported.status()) {
            case SUCCEEDED -> reported.paid() && payment.covers(reported.amount(), reported.currency())
                    ? payment.succeed(clock.instant())
                    : mismatch(payment, reported);
            case CANCELED -> payment.cancel();
            case PENDING -> payment;
        };
        return settled == payment ? payment : payments.save(settled);
    }

    private Payment mismatch(Payment payment, GatewayPayment reported) {
        log.warn("Payment {} reported succeeded with paid={} amount={} {}, expected {} {}; left pending",
                payment.id(), reported.paid(), reported.amount(), reported.currency(),
                payment.amount(), payment.currency());
        return payment;
    }

    private static String resolveBase(String configured, String corsOrigins) {
        String base = !configured.isBlank() ? configured : corsOrigins.split(",")[0];
        base = base.trim();
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }
}
