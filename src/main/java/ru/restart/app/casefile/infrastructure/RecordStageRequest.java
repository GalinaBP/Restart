package ru.restart.app.casefile.infrastructure;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ru.restart.app.casefile.domain.StageStatus;

import java.time.LocalDate;

/** Recording where a stage stands. Dates and note are optional — the status is the point. */
public record RecordStageRequest(
        @NotNull(message = "Укажите, на чём сейчас этот шаг")
        StageStatus status,

        LocalDate startedOn,

        LocalDate completedOn,

        @Size(max = 2000, message = "Заметка слишком длинная — оставьте до 2000 символов")
        String note) {
}
