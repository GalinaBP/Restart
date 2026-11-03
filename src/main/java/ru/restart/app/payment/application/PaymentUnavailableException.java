package ru.restart.app.payment.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

public class PaymentUnavailableException extends BusinessException {

    public PaymentUnavailableException() {
        super(ErrorCode.PAYMENT_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE,
                "Оплата сейчас не отвечает — попробуйте через несколько минут");
    }
}
