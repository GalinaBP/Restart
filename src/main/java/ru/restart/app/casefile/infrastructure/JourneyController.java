package ru.restart.app.casefile.infrastructure;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.restart.app.casefile.application.JourneyService;
import ru.restart.app.casefile.domain.JourneyStage;
import ru.restart.app.common.web.ApiPaths;

import java.util.UUID;

/**
 * The guided journey through the court procedure (backlog AI-018) — the map behind the stepper
 * screen. Ownership follows the other case endpoints: someone else's case is answered with the
 * same 404 as an unknown case id. Stage composition and their 127-ФЗ traceability live in
 * {@code casefile/journey.yml} (placeholder pending lawyer review).
 */
@RestController
@RequestMapping(ApiPaths.API_V1 + "/cases/{caseId}/journey")
@Tag(name = "Case journey", description = "Stages of the court bankruptcy procedure")
public class JourneyController {

    private final JourneyService service;

    public JourneyController(JourneyService service) {
        this.service = service;
    }

    @Operation(summary = "Journey map",
            description = "Every stage that applies to the case, in order, with its status and "
                    + "the current stage marked. Only the common path is listed until the court's "
                    + "chosen procedure is recorded.")
    @GetMapping
    public JourneyResponse journey(@PathVariable UUID caseId) {
        return JourneyResponse.from(service.journeyOf(caseId));
    }

    @Operation(summary = "Record a stage",
            description = "Records where a stage stands, with optional dates and a note. "
                    + "409 for a stage whose status is derived from the case data itself.")
    @PutMapping("/{stage}")
    public JourneyResponse recordStage(@PathVariable UUID caseId, @PathVariable JourneyStage stage,
                                       @Valid @RequestBody RecordStageRequest request) {
        return JourneyResponse.from(service.recordStage(caseId, stage, request.status(),
                request.startedOn(), request.completedOn(), request.note()));
    }

    @Operation(summary = "Record the court's procedure",
            description = "Switches the journey to the branch of the procedure the court applied. "
                    + "A null value clears it and returns the case to the common path.")
    @PutMapping("/procedure-type")
    public JourneyResponse recordProcedureType(@PathVariable UUID caseId,
                                               @RequestBody RecordProcedureTypeRequest request) {
        return JourneyResponse.from(service.recordProcedureType(caseId, request.procedureType()));
    }
}
