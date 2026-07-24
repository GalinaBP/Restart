package ru.restart.app.casefile.infrastructure;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.restart.app.casefile.application.ClaimDeadlineService;
import ru.restart.app.common.web.ApiPaths;

import java.util.UUID;

/**
 * The claim-filing deadline (backlog AI-025): how many calendar days after the ЕФРСБ publication
 * creditors have to file their claims, and — once a publication date is on file — the deadline
 * itself. The period comes from {@code casefile/claim-deadline.yml}, a statutory number treated
 * with the same discipline as the filing fees (AI-021). Scoped to a case — the caller must own it.
 */
@RestController
@RequestMapping(ApiPaths.API_V1 + "/cases/{caseId}/claim-deadline")
@Tag(name = "Claim deadline", description = "Deadline for creditors to file claims with the court")
public class ClaimDeadlineController {

    private final ClaimDeadlineService service;

    public ClaimDeadlineController(ClaimDeadlineService service) {
        this.service = service;
    }

    @Operation(summary = "The claim-filing deadline",
            description = "The configured period and, once a ЕФРСБ publication date is recorded "
                    + "on the case, the computed deadline. `confirmed` is false while the period "
                    + "is an unreviewed placeholder — the client must then present it as a draft.")
    @GetMapping
    public ClaimDeadlineResponse claimDeadline(@PathVariable UUID caseId) {
        return ClaimDeadlineResponse.from(service.deadlineOf(caseId));
    }
}
