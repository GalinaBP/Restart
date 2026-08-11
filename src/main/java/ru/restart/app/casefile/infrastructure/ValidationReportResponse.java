package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.ValidationIssue;

import java.util.List;

public record ValidationReportResponse(boolean valid, List<ValidationIssueResponse> issues) {

    static ValidationReportResponse from(List<ValidationIssue> issues) {
        return new ValidationReportResponse(issues.isEmpty(),
                issues.stream().map(ValidationIssueResponse::from).toList());
    }
}
