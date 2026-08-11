package ru.restart.app.casefile.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.casefile.domain.JourneyStage;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

public class DerivedStageException extends BusinessException {

    public DerivedStageException(JourneyStage stage) {
        super(ErrorCode.INVALID_STATE, HttpStatus.CONFLICT,
                stage == JourneyStage.DOCUMENT_PREPARATION
                        ? "Этот шаг отмечается сам — по тому, как заполнено дело и готовы ли документы"
                        : "Этот шаг отмечается сам — его нельзя изменить вручную");
    }
}
