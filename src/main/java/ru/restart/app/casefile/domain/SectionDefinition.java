package ru.restart.app.casefile.domain;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Definition of one data-collection section, as configured in {@code casefile/sections.yml}.
 *
 * @param key            the addressable step key
 * @param order          position in the step-by-step journey
 * @param repeatable     true when the payload is a list of entries (creditors, vehicles, …)
 * @param mandatory      true when an empty/absent section blocks document generation
 * @param statutoryBasis the 127-ФЗ provision the section traces back to (placeholder pending
 *                       lawyer review) — kept with the definition so legal traceability travels
 *                       with the config
 * @param uniqueBy       repeatable only: entries with equal values of these fields count as
 *                       duplicates (empty when the section has no duplicate rule)
 * @param fields         the section's fields (of one entry, when repeatable)
 */
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
