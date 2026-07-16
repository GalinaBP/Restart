package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.ValidationIssue;

import java.util.List;

/**
 * The whole-case validation report. {@code valid} is the single flag the document-generation gate
 * (backlog AI-007) will check; {@code issues} tells the user exactly what is left to fix.
 */
public record ValidationReportResponse(boolean valid, List<ValidationIssueResponse> issues) {

    static ValidationReportResponse from(List<ValidationIssue> issues) {
        return new ValidationReportResponse(issues.isEmpty(),
                issues.stream().map(ValidationIssueResponse::from).toList());
    }
}
