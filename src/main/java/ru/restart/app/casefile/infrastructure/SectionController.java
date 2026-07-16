package ru.restart.app.casefile.infrastructure;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.restart.app.casefile.application.SectionService;
import ru.restart.app.casefile.domain.SectionKey;
import ru.restart.app.common.web.ApiPaths;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

/**
 * The step-by-step data collection of a case. Ownership follows the case endpoints: someone
 * else's case — and therefore its sections — is answered with the same 404 as an unknown case id.
 * Section field sets and their 127-ФЗ traceability live in {@code casefile/sections.yml}
 * (placeholder pending lawyer review).
 */
@RestController
@RequestMapping(ApiPaths.API_V1 + "/cases/{caseId}/sections")
@Tag(name = "Case sections", description = "Step-by-step data collection for the filing")
public class SectionController {

    private final SectionService service;
    private final ObjectMapper objectMapper;

    public SectionController(SectionService service, ObjectMapper objectMapper) {
        this.service = service;
        this.objectMapper = objectMapper;
    }

    @Operation(summary = "Journey overview",
            description = "Every section in order with its filled state — the client resumes the "
                    + "journey from here.")
    @GetMapping
    public List<SectionStatusResponse> overview(@PathVariable UUID caseId) {
        return service.overview(caseId).stream().map(SectionStatusResponse::from).toList();
    }

    @Operation(summary = "One section's data",
            description = "The section definition plus collected data (null while empty), for "
                    + "prefilling the step's screen.")
    @GetMapping("/{key}")
    public SectionContentResponse get(@PathVariable UUID caseId, @PathVariable SectionKey key) {
        return SectionContentResponse.from(service.get(caseId, key), objectMapper);
    }

    @Operation(summary = "Save a section",
            description = "Replaces the section's data: an object for regular sections, the full "
                    + "entry list for repeatable ones (add/remove entries by re-sending the "
                    + "list). Unknown fields are rejected; the first save moves a draft case to "
                    + "in_progress. Value-level validation arrives with the validation engine "
                    + "(AI-003).")
    @PutMapping("/{key}")
    public SectionContentResponse put(@PathVariable UUID caseId, @PathVariable SectionKey key,
                                      @RequestBody JsonNode payload) {
        return SectionContentResponse.from(service.put(caseId, key, payload), objectMapper);
    }
}
