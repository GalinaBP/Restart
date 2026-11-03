package ru.restart.app.payment.infrastructure;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import ru.restart.app.payment.application.GatewayPayment;
import ru.restart.app.payment.application.PaymentGateway;
import ru.restart.app.payment.application.PaymentOrder;
import ru.restart.app.payment.application.PaymentUnavailableException;

@Configuration
@EnableConfigurationProperties(YooKassaProperties.class)
class PaymentGatewayConfig {

    @Bean
    @ConditionalOnProperty(name = "restart.payment.enabled", havingValue = "true")
    PaymentGateway yooKassaGateway(YooKassaProperties properties) {
        return new YooKassaGateway(properties);
    }

    @Bean
    @ConditionalOnMissingBean(PaymentGateway.class)
    PaymentGateway disabledPaymentGateway() {
        return new PaymentGateway() {
            @Override
            public GatewayPayment create(PaymentOrder order) {
                throw new PaymentUnavailableException();
            }

            @Override
            public GatewayPayment fetch(String providerPaymentId) {
                throw new PaymentUnavailableException();
            }
        };
    }
}
