package ru.restart.app.casefile.infrastructure;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.restart.app.casefile.application.ValidationService;
import ru.restart.app.common.web.ApiPaths;

import java.util.UUID;

/**
 * The whole-case validation report (backlog AI-003). Read-only: validation never blocks saving —
 * it tells the user what is still missing or malformed before documents can be generated. Rules
 * are deterministic and configured in {@code casefile/sections.yml} (placeholder pending lawyer
 * review); ownership follows the case endpoints.
 */
@RestController
@RequestMapping(ApiPaths.API_V1 + "/cases/{caseId}/validation")
@Tag(name = "Case validation", description = "What still has to be fixed before the filing")
public class ValidationController {

    private final ValidationService service;

    public ValidationController(ValidationService service) {
        this.service = service;
    }

    @Operation(summary = "Validate the whole case",
            description = "Runs every configured rule over all sections — including mandatory "
                    + "sections never saved — and returns findings addressed to section/entry/"
                    + "field. valid=true means document generation may proceed (AI-007 gates on "
                    + "this).")
    @GetMapping
    public ValidationReportResponse validate(@PathVariable UUID caseId) {
        return ValidationReportResponse.from(service.validateCase(caseId));
    }
}
