package ru.restart.app.casefile.domain;

public record ValidationIssue(
        SectionKey section,
        Integer entryIndex,
        String field,
        ValidationCode code,
        String message) {

    public static ValidationIssue ofSection(SectionKey section, ValidationCode code, String message) {
        return new ValidationIssue(section, null, null, code, message);
    }

    public static ValidationIssue ofField(SectionKey section, Integer entryIndex, String field,
                                          ValidationCode code, String message) {
        return new ValidationIssue(section, entryIndex, field, code, message);
    }
}
