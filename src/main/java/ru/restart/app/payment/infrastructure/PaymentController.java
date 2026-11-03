package ru.restart.app.payment.infrastructure;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.restart.app.common.web.ApiPaths;
import ru.restart.app.payment.application.PaymentService;

import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1 + "/payments")
@Tag(name = "Payments", description = "The one-off payment that opens the journey, through YooKassa")
public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    @Operation(summary = "Whether the caller has access",
            description = "granted is true once the account has a succeeded payment, or always when "
                    + "payments are switched off. Carries the price to show on the paywall.")
    @GetMapping("/access")
    public PaymentAccessResponse access() {
        return PaymentAccessResponse.from(service.access());
    }

    @Operation(summary = "Start a payment",
            description = "Creates a YooKassa payment and returns the URL to send the person to. "
                    + "409 when access is already granted, 503 when YooKassa does not answer.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StartPaymentResponse start() {
        return StartPaymentResponse.from(service.start());
    }

    @Operation(summary = "Status of one of the caller's payments",
            description = "A pending payment is checked with YooKassa before answering. 404 for a "
                    + "payment that is not the caller's.")
    @GetMapping("/{paymentId}")
    public PaymentStatusResponse status(@PathVariable UUID paymentId) {
        return new PaymentStatusResponse(service.status(paymentId));
    }

    @Operation(summary = "YooKassa notification",
            description = "Public webhook. The body is only a hint: the payment is re-read from "
                    + "YooKassa with the shop credentials before anything changes.")
    @PostMapping("/yookassa/notifications")
    public void notification(@RequestBody YooKassaNotification notification) {
        if (notification.object() != null && notification.object().id() != null
                && !notification.object().id().isBlank()) {
            service.handleNotification(notification.object().id());
        }
    }
}
