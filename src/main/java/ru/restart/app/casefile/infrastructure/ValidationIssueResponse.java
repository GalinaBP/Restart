package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.ValidationIssue;

public record ValidationIssueResponse(
        String section,
        Integer entryIndex,
        String field,
        String code,
        String message) {

    static ValidationIssueResponse from(ValidationIssue issue) {
        return new ValidationIssueResponse(issue.section().name(), issue.entryIndex(),
                issue.field(), issue.code().name(), issue.message());
    }
}
