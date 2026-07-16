package ru.restart.app.casefile.infrastructure;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;
import ru.restart.app.casefile.domain.FieldDefinition;
import ru.restart.app.casefile.domain.FieldType;
import ru.restart.app.casefile.domain.SectionDefinition;
import ru.restart.app.casefile.domain.SectionKey;
import ru.restart.app.casefile.domain.SectionRegistry;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Loads the section definitions from {@code casefile/sections.yml} at startup and fails fast on an
 * inconsistent config: every {@link SectionKey} must be defined exactly once and carry at least one
 * field and a statutory-basis reference. The YAML is the single source of truth the backlog asks
 * for — legislative changes edit the file, not this class.
 */
@Component
class YamlSectionRegistry implements SectionRegistry {

    private static final String RESOURCE = "casefile/sections.yml";

    private final Map<SectionKey, SectionDefinition> byKey = new EnumMap<>(SectionKey.class);
    private final List<SectionDefinition> ordered;

    YamlSectionRegistry() {
        for (Map<String, Object> raw : load()) {
            SectionDefinition definition = toDefinition(raw);
            if (byKey.put(definition.key(), definition) != null) {
                throw new IllegalStateException(
                        RESOURCE + ": duplicate section " + definition.key());
            }
        }
        for (SectionKey key : SectionKey.values()) {
            if (!byKey.containsKey(key)) {
                throw new IllegalStateException(RESOURCE + ": missing section " + key);
            }
        }
        this.ordered = byKey.values().stream()
                .sorted(Comparator.comparingInt(SectionDefinition::order))
                .toList();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> load() {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            Map<String, Object> root = new Yaml().load(in);
            return (List<Map<String, Object>>) root.get("sections");
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot read " + RESOURCE, ex);
        }
    }

    @SuppressWarnings("unchecked")
    private static SectionDefinition toDefinition(Map<String, Object> raw) {
        SectionKey key = SectionKey.valueOf((String) raw.get("key"));
        List<Map<String, Object>> rawFields = (List<Map<String, Object>>) raw.get("fields");
        String statutoryBasis = (String) raw.get("statutoryBasis");
        if (rawFields == null || rawFields.isEmpty()) {
            throw new IllegalStateException(RESOURCE + ": section " + key + " has no fields");
        }
        if (statutoryBasis == null || statutoryBasis.isBlank()) {
            throw new IllegalStateException(
                    RESOURCE + ": section " + key + " has no statutoryBasis");
        }
        List<FieldDefinition> fields = rawFields.stream()
                .map(f -> new FieldDefinition((String) f.get("name"),
                        FieldType.valueOf((String) f.get("type")),
                        Boolean.TRUE.equals(f.get("required"))))
                .toList();
        List<String> uniqueBy = raw.get("uniqueBy") == null
                ? List.of()
                : List.copyOf((List<String>) raw.get("uniqueBy"));
        SectionDefinition definition = new SectionDefinition(key, (Integer) raw.get("order"),
                (Boolean) raw.get("repeatable"), Boolean.TRUE.equals(raw.get("mandatory")),
                statutoryBasis, uniqueBy, fields);
        if (fields.stream().map(FieldDefinition::name).distinct().count() != fields.size()) {
            throw new IllegalStateException(RESOURCE + ": section " + key + " has duplicate fields");
        }
        if (!definition.fieldSet().containsAll(uniqueBy)) {
            throw new IllegalStateException(
                    RESOURCE + ": section " + key + " uniqueBy references unknown fields");
        }
        return definition;
    }

    @Override
    public List<SectionDefinition> all() {
        return ordered;
    }

    @Override
    public SectionDefinition get(SectionKey key) {
        return byKey.get(key);
    }
}
