package ru.restart.app.casefile.domain;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public record SectionDefinition(
        SectionKey key,
        int order,
        boolean repeatable,
        boolean mandatory,
        String statutoryBasis,
        List<String> uniqueBy,
        List<FieldDefinition> fields) {

    public Set<String> fieldSet() {
        return fields.stream().map(FieldDefinition::name).collect(Collectors.toUnmodifiableSet());
    }
}
