package ru.restart.app.casefile.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

/**
 * Document generation refused because the case does not pass validation. A hard gate, not a
 * warning (backlog AI-006/AI-007): the client fetches the specific missing items from
 * {@code GET /cases/{id}/validation}; the dedicated missing-info contract is AI-007.
 */
public class GenerationBlockedException extends BusinessException {

    public GenerationBlockedException() {
        super(ErrorCode.INVALID_STATE, HttpStatus.CONFLICT,
                "Пока нельзя собрать документы — сначала заполни обязательные разделы");
    }
}
