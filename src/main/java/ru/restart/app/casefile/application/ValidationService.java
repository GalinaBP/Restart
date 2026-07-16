package ru.restart.app.casefile.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseSection;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.CaseValidator;
import ru.restart.app.casefile.domain.SectionDefinition;
import ru.restart.app.casefile.domain.SectionKey;
import ru.restart.app.casefile.domain.SectionRegistry;
import ru.restart.app.casefile.domain.ValidationIssue;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Runs the deterministic validation engine over collected case data (backlog AI-003). Validation
 * never blocks saving — partial data is expected while the user is mid-journey — it reports what
 * still has to be fixed; the document-generation gate (AI-007) will consume the same report.
 */
@Service
public class ValidationService {

    private final CaseService caseService;
    private final CaseSectionRepository sections;
    private final SectionRegistry registry;
    private final ObjectMapper objectMapper;
    private final CaseValidator validator = new CaseValidator();

    public ValidationService(CaseService caseService, CaseSectionRepository sections,
                             SectionRegistry registry, ObjectMapper objectMapper) {
        this.caseService = caseService;
        this.sections = sections;
        this.registry = registry;
        this.objectMapper = objectMapper;
    }

    /** The full case report: every section validated, never-saved mandatory sections included. */
    @Transactional(readOnly = true)
    public List<ValidationIssue> validateCase(UUID caseId) {
        BankruptcyCase bankruptcyCase = caseService.get(caseId);
        Map<SectionKey, String> saved = sections.findByCaseId(bankruptcyCase.id()).stream()
                .collect(Collectors.toMap(CaseSection::key, CaseSection::payloadJson));
        List<ValidationIssue> issues = new ArrayList<>();
        for (SectionDefinition definition : registry.all()) {
            issues.addAll(validator.validateSection(definition, parse(saved.get(definition.key()))));
        }
        return issues;
    }

    /** One section's findings against an in-memory payload (used right after a step is saved). */
    public List<ValidationIssue> validateSection(SectionDefinition definition, JsonNode payload) {
        return validator.validateSection(definition, payload);
    }

    private JsonNode parse(String payloadJson) {
        return payloadJson == null ? null : objectMapper.readTree(payloadJson);
    }
}
