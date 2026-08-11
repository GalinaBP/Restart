package ru.restart.app.casefile.infrastructure;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.restart.app.casefile.application.SectionContent;
import ru.restart.app.casefile.application.SectionService;
import ru.restart.app.casefile.application.ValidationService;
import ru.restart.app.casefile.domain.SectionKey;
import ru.restart.app.common.web.ApiPaths;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1 + "/cases/{caseId}/sections")
@Tag(name = "Case sections", description = "Step-by-step data collection for the filing")
public class SectionController {

    private final SectionService service;
    private final ValidationService validationService;
    private final ObjectMapper objectMapper;

    public SectionController(SectionService service, ValidationService validationService,
                             ObjectMapper objectMapper) {
        this.service = service;
        this.validationService = validationService;
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
            description = "The section definition plus collected data (null while empty) and the "
                    + "step's current validation findings, for prefilling the step's screen.")
    @GetMapping("/{key}")
    public SectionContentResponse get(@PathVariable UUID caseId, @PathVariable SectionKey key) {
        return withIssues(service.get(caseId, key));
    }

    @Operation(summary = "Save a section",
            description = "Replaces the section's data: an object for regular sections, the full "
                    + "entry list for repeatable ones (add/remove entries by re-sending the "
                    + "list). Unknown fields are rejected; the first save moves a draft case to "
                    + "in_progress. Value problems (formats, required fields, duplicates) never "
                    + "block saving — they come back in `issues` for the UI to show.")
    @PutMapping("/{key}")
    public SectionContentResponse put(@PathVariable UUID caseId, @PathVariable SectionKey key,
                                      @RequestBody JsonNode payload) {
        return withIssues(service.put(caseId, key, payload));
    }

    private SectionContentResponse withIssues(SectionContent content) {
        JsonNode payload = content.payloadJson() == null
                ? null
                : objectMapper.readTree(content.payloadJson());
        return SectionContentResponse.from(content,
                validationService.validateSection(content.definition(), payload), objectMapper);
    }
}
