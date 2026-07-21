package ru.restart.app.casefile.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

/**
 * A user can have at most one active (not yet filed) case — the product is a single journey, not a
 * case archive. Creating a second one conflicts with the existing case.
 */
public class ActiveCaseExistsException extends BusinessException {

    public ActiveCaseExistsException() {
        super(ErrorCode.INVALID_STATE, HttpStatus.CONFLICT,
                "У вас уже есть начатое дело — продолжите его");
    }
}
