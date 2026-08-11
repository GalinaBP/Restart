package ru.restart.app.auth.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

public class InvalidResetLinkException extends BusinessException {

    public InvalidResetLinkException() {
        super(ErrorCode.RESET_LINK_INVALID, HttpStatus.BAD_REQUEST,
                "Ссылка не подходит или устарела. Запросите новую на экране входа");
    }
}
