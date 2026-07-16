package ru.restart.app.casefile.domain;

/**
 * Deterministic value types a section field may declare in {@code casefile/sections.yml}. Each has
 * exactly one validation rule in {@link CaseValidator} — no heuristics, no AI, per the backlog's
 * hard requirement for the validation path.
 */
public enum FieldType {
    STRING,
    BOOLEAN,
    INTEGER,
    /** Non-negative decimal amount. */
    MONEY,
    /** ISO date, {@code ГГГГ-ММ-ДД}. */
    DATE,
    /** RF passport series: exactly 4 digits. */
    PASSPORT_SERIES,
    /** RF passport number: exactly 6 digits. */
    PASSPORT_NUMBER,
    /** Taxpayer id: 10 or 12 digits with valid checksum digits (ФНС algorithm). */
    INN
}
