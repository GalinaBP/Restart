package ru.restart.app.casefile.domain;

/**
 * One field of a section, as configured in {@code casefile/sections.yml}.
 *
 * @param name     field key as submitted by the client
 * @param type     deterministic value type, see {@link FieldType}
 * @param required true when the field must be present and non-blank for the section to be complete
 */
public record FieldDefinition(String name, FieldType type, boolean required) {
}
