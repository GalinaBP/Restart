package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.ValidationIssue;

/**
 * One validation finding as the client sees it: addressed to section / entry / field so the UI
 * can navigate straight to the right screen element ({@code entryIndex} and {@code field} are
 * null for section-level findings). {@code message} is shown to the user as-is.
 */
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
