package ru.restart.app.casefile.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

public class ActiveCaseExistsException extends BusinessException {

    public ActiveCaseExistsException() {
        super(ErrorCode.INVALID_STATE, HttpStatus.CONFLICT,
                "У вас уже есть начатое дело — продолжите его");
    }
}
