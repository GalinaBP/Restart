package ru.restart.app.payment.application;

import org.junit.jupiter.api.Test;
import ru.restart.app.common.error.ResourceNotFoundException;
import ru.restart.app.common.security.AuthenticatedUser;
import ru.restart.app.common.security.CurrentUser;
import ru.restart.app.payment.domain.Payment;
import ru.restart.app.payment.domain.PaymentRepository;
import ru.restart.app.payment.domain.PaymentStatus;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class PaymentServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-03T10:00:00Z");
    private static final BigDecimal PRICE = new BigDecimal("1000.00");

    private final InMemoryPayments payments = new InMemoryPayments();
    private final StubGateway gateway = new StubGateway();
    private final StubCurrentUser currentUser = new StubCurrentUser();
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);

    private PaymentService service(boolean enabled) {
        return new PaymentService(payments, gateway, currentUser, clock, enabled, new BigDecimal("1000"),
                "https://restart.example/", "");
    }

    @Test
    void switchedOffPaymentsGrantEveryoneAccessAndRefuseToCharge() {
        PaymentService service = service(false);

        assertThat(service.access().granted()).isTrue();
        assertThatExceptionOfType(AccessAlreadyGrantedException.class).isThrownBy(service::start);
        assertThat(gateway.orders).isEmpty();
    }

    @Test
    void accessIsClosedUntilAPaymentSucceeds() {
        PaymentAccess access = service(true).access();

        assertThat(access.granted()).isFalse();
        assertThat(access.price()).isEqualTo(PRICE);
        assertThat(access.currency()).isEqualTo("RUB");
    }

    @Test
    void startAsksTheGatewayForTheFullPriceAndKeepsAPendingPayment() {
        StartedPayment started = service(true).start();

        PaymentOrder order = gateway.orders.getFirst();
        assertThat(order.paymentId()).isEqualTo(started.paymentId());
        assertThat(order.amount()).isEqualTo(PRICE);
        assertThat(order.currency()).isEqualTo("RUB");
        assertThat(order.customerEmail()).isEqualTo(currentUser.user.email());
        assertThat(order.returnUrl())
                .isEqualTo("https://restart.example/pay/return?payment=" + started.paymentId());
        assertThat(started.confirmationUrl()).isEqualTo("https://yoomoney.ru/checkout/" + order.paymentId());

        Payment stored = payments.findById(started.paymentId()).orElseThrow();
        assertThat(stored.status()).isEqualTo(PaymentStatus.PENDING);
        assertThat(stored.userId()).isEqualTo(currentUser.user.userId());
        assertThat(stored.providerPaymentId()).isEqualTo("yk-" + started.paymentId());
    }

    @Test
    void succeededPaymentOpensAccessAndCannotBeChargedTwice() {
        PaymentService service = service(true);
        StartedPayment started = service.start();
        gateway.report(PaymentStatus.SUCCEEDED, true, PRICE, "RUB");

        assertThat(service.status(started.paymentId())).isEqualTo(PaymentStatus.SUCCEEDED);
        assertThat(payments.findById(started.paymentId()).orElseThrow().paidAt()).isEqualTo(NOW);
        assertThat(service.access().granted()).isTrue();
        assertThatExceptionOfType(AccessAlreadyGrantedException.class).isThrownBy(service::start);
    }

    @Test
    void reportedSuccessForTheWrongAmountLeavesThePaymentPending() {
        PaymentService service = service(true);
        StartedPayment started = service.start();
        gateway.report(PaymentStatus.SUCCEEDED, true, new BigDecimal("1.00"), "RUB");

        assertThat(service.status(started.paymentId())).isEqualTo(PaymentStatus.PENDING);
        assertThat(service.access().granted()).isFalse();
    }

    @Test
    void canceledPaymentKeepsAccessClosed() {
        PaymentService service = service(true);
        StartedPayment started = service.start();
        gateway.report(PaymentStatus.CANCELED, false, PRICE, "RUB");

        assertThat(service.status(started.paymentId())).isEqualTo(PaymentStatus.CANCELED);
        assertThat(service.access().granted()).isFalse();
    }

    @Test
    void settledPaymentIsNotAskedAboutAgain() {
        PaymentService service = service(true);
        StartedPayment started = service.start();
        gateway.report(PaymentStatus.SUCCEEDED, true, PRICE, "RUB");
        service.status(started.paymentId());
        gateway.fetches = 0;

        assertThat(service.status(started.paymentId())).isEqualTo(PaymentStatus.SUCCEEDED);
        service.handleNotification("yk-" + started.paymentId());
        assertThat(gateway.fetches).isZero();
    }

    @Test
    void someoneElsesPaymentIsNotFound() {
        PaymentService service = service(true);
        StartedPayment started = service.start();
        currentUser.user = new AuthenticatedUser(UUID.randomUUID(), "other@mail.ru", "ROLE_USER");

        assertThatExceptionOfType(ResourceNotFoundException.class)
                .isThrownBy(() -> service.status(started.paymentId()));
    }

    @Test
    void notificationRereadsThePaymentFromTheGateway() {
        PaymentService service = service(true);
        StartedPayment started = service.start();
        gateway.report(PaymentStatus.SUCCEEDED, true, PRICE, "RUB");

        service.handleNotification("yk-" + started.paymentId());

        assertThat(gateway.fetches).isEqualTo(1);
        assertThat(payments.findById(started.paymentId()).orElseThrow().status())
                .isEqualTo(PaymentStatus.SUCCEEDED);
    }

    @Test
    void notificationForAnUnknownPaymentIsIgnored() {
        service(true).handleNotification("yk-made-up");

        assertThat(gateway.fetches).isZero();
    }

    private static final class StubGateway implements PaymentGateway {

        private final List<PaymentOrder> orders = new ArrayList<>();
        private PaymentStatus status = PaymentStatus.PENDING;
        private boolean paid;
        private BigDecimal amount = PRICE;
        private String currency = "RUB";
        private int fetches;

        void report(PaymentStatus status, boolean paid, BigDecimal amount, String currency) {
            this.status = status;
            this.paid = paid;
            this.amount = amount;
            this.currency = currency;
        }

        @Override
        public GatewayPayment create(PaymentOrder order) {
            orders.add(order);
            return new GatewayPayment("yk-" + order.paymentId(), PaymentStatus.PENDING, false,
                    order.amount(), order.currency(), "https://yoomoney.ru/checkout/" + order.paymentId());
        }

        @Override
        public GatewayPayment fetch(String providerPaymentId) {
            fetches++;
            return new GatewayPayment(providerPaymentId, status, paid, amount, currency, null);
        }
    }

    private static final class InMemoryPayments implements PaymentRepository {

        private final Map<UUID, Payment> byId = new HashMap<>();

        @Override
        public Payment save(Payment payment) {
            byId.put(payment.id(), payment);
            return payment;
        }

        @Override
        public Optional<Payment> findById(UUID id) {
            return Optional.ofNullable(byId.get(id));
        }

        @Override
        public Optional<Payment> findByProviderPaymentId(String providerPaymentId) {
            return byId.values().stream()
                    .filter(p -> p.providerPaymentId().equals(providerPaymentId))
                    .findFirst();
        }

        @Override
        public boolean existsSucceededForUser(UUID userId) {
            return byId.values().stream()
                    .anyMatch(p -> p.userId().equals(userId) && p.status() == PaymentStatus.SUCCEEDED);
        }
    }

    private static final class StubCurrentUser implements CurrentUser {

        private AuthenticatedUser user = new AuthenticatedUser(UUID.randomUUID(), "anna@mail.ru", "ROLE_USER");

        @Override
        public Optional<AuthenticatedUser> get() {
            return Optional.of(user);
        }

        @Override
        public AuthenticatedUser require() {
            return user;
        }
    }
}
