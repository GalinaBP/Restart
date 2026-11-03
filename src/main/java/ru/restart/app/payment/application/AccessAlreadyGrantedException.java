package ru.restart.app.payment.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

public class AccessAlreadyGrantedException extends BusinessException {

    public AccessAlreadyGrantedException() {
        super(ErrorCode.ACCESS_ALREADY_GRANTED, HttpStatus.CONFLICT,
                "Доступ уже открыт — платить ещё раз не нужно");
    }
}
