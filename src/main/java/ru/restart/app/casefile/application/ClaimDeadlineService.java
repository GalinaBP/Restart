package ru.restart.app.casefile.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.ClaimDeadline;
import ru.restart.app.casefile.domain.ClaimDeadlineCalculator;
import ru.restart.app.casefile.domain.ClaimDeadlinePolicy;
import ru.restart.app.casefile.domain.SectionKey;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.util.UUID;

@Service
public class ClaimDeadlineService {

    private final CaseService cases;
    private final CaseSectionRepository sections;
    private final ClaimDeadlinePolicy policy;
    private final ObjectMapper objectMapper;

    public ClaimDeadlineService(CaseService cases, CaseSectionRepository sections,
                               ClaimDeadlinePolicy policy, ObjectMapper objectMapper) {
        this.cases = cases;
        this.sections = sections;
        this.policy = policy;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public ClaimDeadlineView deadlineOf(UUID caseId) {
        cases.get(caseId);
        LocalDate publicationDate = publicationDate(caseId);
        ClaimDeadline deadline = policy.current();
        LocalDate deadlineDate = ClaimDeadlineCalculator.deadlineFrom(
                publicationDate, deadline.daysFromPublication());
        return new ClaimDeadlineView(publicationDate, deadlineDate,
                deadline.daysFromPublication(), deadline.confirmed());
    }

    private LocalDate publicationDate(UUID caseId) {
        JsonNode section = sections.findByCaseIdAndKey(caseId, SectionKey.EFRSB_PUBLICATION)
                .map(saved -> objectMapper.readTree(saved.payloadJson()))
                .orElse(null);
        String isoDate = text(section, "publicationDate");
        return isoDate.isBlank() ? null : LocalDate.parse(isoDate);
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value == null || value.isNull() ? "" : value.asString();
    }
}
