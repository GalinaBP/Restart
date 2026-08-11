package ru.restart.app.casefile.infrastructure;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;
import ru.restart.app.casefile.domain.JourneyRegistry;
import ru.restart.app.casefile.domain.JourneyStage;
import ru.restart.app.casefile.domain.ProcedureType;
import ru.restart.app.casefile.domain.StageDefinition;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
class YamlJourneyRegistry implements JourneyRegistry {

    private static final String RESOURCE = "casefile/journey.yml";
    private static final String COMMON_BRANCH = "ALL";

    private final Map<JourneyStage, StageDefinition> byKey = new EnumMap<>(JourneyStage.class);
    private final List<StageDefinition> ordered;

    YamlJourneyRegistry() {
        for (Map<String, Object> raw : load()) {
            StageDefinition definition = toDefinition(raw);
            if (byKey.put(definition.key(), definition) != null) {
                throw new IllegalStateException(RESOURCE + ": duplicate stage " + definition.key());
            }
        }
        for (JourneyStage stage : JourneyStage.values()) {
            if (!byKey.containsKey(stage)) {
                throw new IllegalStateException(RESOURCE + ": missing stage " + stage);
            }
        }
        this.ordered = byKey.values().stream()
                .sorted(Comparator.comparingInt(StageDefinition::order))
                .toList();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> load() {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            Map<String, Object> root = new Yaml().load(in);
            return (List<Map<String, Object>>) root.get("stages");
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot read " + RESOURCE, ex);
        }
    }

    private static StageDefinition toDefinition(Map<String, Object> raw) {
        JourneyStage key = JourneyStage.valueOf((String) raw.get("key"));
        String statutoryBasis = (String) raw.get("statutoryBasis");
        if (statutoryBasis == null || statutoryBasis.isBlank()) {
            throw new IllegalStateException(RESOURCE + ": stage " + key + " has no statutoryBasis");
        }
        Integer order = (Integer) raw.get("order");
        if (order == null) {
            throw new IllegalStateException(RESOURCE + ": stage " + key + " has no order");
        }
        String rawBranch = (String) raw.get("branch");
        if (rawBranch == null || rawBranch.isBlank()) {
            throw new IllegalStateException(RESOURCE + ": stage " + key + " has no branch");
        }
        ProcedureType branch = COMMON_BRANCH.equals(rawBranch)
                ? null
                : ProcedureType.valueOf(rawBranch);
        return new StageDefinition(key, order, branch, Boolean.TRUE.equals(raw.get("derived")),
                statutoryBasis);
    }

    @Override
    public List<StageDefinition> all() {
        return ordered;
    }

    @Override
    public List<StageDefinition> forProcedure(Optional<ProcedureType> procedure) {
        return ordered.stream().filter(stage -> stage.appliesTo(procedure)).toList();
    }

    @Override
    public StageDefinition get(JourneyStage stage) {
        return byKey.get(stage);
    }
}
