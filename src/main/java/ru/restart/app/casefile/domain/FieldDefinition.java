package ru.restart.app.casefile.domain;

public record FieldDefinition(String name, FieldType type, boolean required) {
}
