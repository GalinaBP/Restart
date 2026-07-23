package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.ProcedureType;

/**
 * Recording the procedure the court applied. {@code null} clears it and puts the case back on the
 * common path — the user may have recorded the wrong one.
 */
public record RecordProcedureTypeRequest(ProcedureType procedureType) {
}
