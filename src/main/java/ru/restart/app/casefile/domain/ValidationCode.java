package ru.restart.app.casefile.domain;

/** Machine-readable kinds of validation findings; part of the API contract like {@code ErrorCode}. */
public enum ValidationCode {
    SECTION_EMPTY,
    REQUIRED_FIELD_MISSING,
    INVALID_TYPE,
    INVALID_DATE,
    INVALID_MONEY,
    INVALID_PASSPORT_SERIES,
    INVALID_PASSPORT_NUMBER,
    INVALID_INN,
    DUPLICATE_ENTRY
}
