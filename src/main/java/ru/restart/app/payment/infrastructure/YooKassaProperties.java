package ru.restart.app.payment.infrastructure;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "restart.payment.yookassa")
public record YooKassaProperties(
        String shopId,
        String secretKey,
        String apiBase,
        boolean receiptEnabled,
        int vatCode) {
}
