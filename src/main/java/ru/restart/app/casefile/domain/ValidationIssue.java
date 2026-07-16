package ru.restart.app.casefile.domain;

/**
 * One validation finding, addressed precisely so the UI can attach it to the right screen element
 * (backlog AI-003: "validation results attach to the specific field/section").
 *
 * @param section    the section the finding belongs to
 * @param entryIndex 0-based entry index for repeatable sections, null otherwise
 * @param field      the field the finding is about, null for section-level findings
 * @param code       machine-readable kind
 * @param message    plain-Russian text shown to the user as-is
 */
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
