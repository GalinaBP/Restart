package ru.restart.app.casefile.domain;

import java.util.List;
import java.util.Set;

/**
 * Definition of one data-collection section, as configured in {@code casefile/sections.yml}.
 *
 * @param key            the addressable step key
 * @param order          position in the step-by-step journey
 * @param repeatable     true when the payload is a list of entries (creditors, vehicles, …)
 * @param statutoryBasis the 127-ФЗ provision the section traces back to (placeholder pending
 *                       lawyer review) — kept with the definition so legal traceability travels
 *                       with the config
 * @param fields         allowed field names of the section (of one entry, when repeatable)
 */
public record SectionDefinition(
        SectionKey key,
        int order,
        boolean repeatable,
        String statutoryBasis,
        List<String> fields) {

    public Set<String> fieldSet() {
        return Set.copyOf(fields);
    }
}
