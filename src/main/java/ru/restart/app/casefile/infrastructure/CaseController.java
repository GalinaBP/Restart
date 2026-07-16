package ru.restart.app.casefile.infrastructure;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.restart.app.casefile.application.CaseService;
import ru.restart.app.common.web.ApiPaths;

import java.util.UUID;

/**
 * The bankruptcy case lifecycle. All endpoints require authentication (the shared security config
 * protects everything outside the explicitly public URLs); the service additionally enforces that
 * a caller only ever sees their own case.
 */
@RestController
@RequestMapping(ApiPaths.API_V1 + "/cases")
@Tag(name = "Cases", description = "The bankruptcy case: the container for the user's journey")
public class CaseController {

    private final CaseService service;

    public CaseController(CaseService service) {
        this.service = service;
    }

    @Operation(summary = "Start a new case",
            description = "Creates the caller's case in draft. 409 if an active (not yet filed) "
                    + "case already exists — the product is a single journey at a time.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CaseResponse create() {
        return CaseResponse.from(service.create());
    }

    @Operation(summary = "The caller's active case",
            description = "The case the journey resumes into. 404 if the caller has none yet.")
    @GetMapping("/current")
    public CaseResponse current() {
        return CaseResponse.from(service.current());
    }

    @Operation(summary = "A case by id",
            description = "Only the owner sees it; anyone else gets the same 404 as for an "
                    + "unknown id.")
    @GetMapping("/{caseId}")
    public CaseResponse get(@PathVariable UUID caseId) {
        return CaseResponse.from(service.get(caseId));
    }
}
