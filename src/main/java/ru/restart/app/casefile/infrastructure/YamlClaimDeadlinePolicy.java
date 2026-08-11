package ru.restart.app.casefile.infrastructure;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;
import ru.restart.app.casefile.domain.ClaimDeadline;
import ru.restart.app.casefile.domain.ClaimDeadlinePolicy;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Map;

@Component
class YamlClaimDeadlinePolicy implements ClaimDeadlinePolicy {

    private static final String RESOURCE = "casefile/claim-deadline.yml";

    private final ClaimDeadline deadline;

    YamlClaimDeadlinePolicy() {
        Map<String, Object> root = load();
        Object rawDays = root.get("daysFromPublication");
        if (rawDays == null) {
            throw new IllegalStateException(RESOURCE + ": daysFromPublication is missing");
        }
        if (!(rawDays instanceof Integer)) {
            throw new IllegalStateException(RESOURCE
                    + ": daysFromPublication must be a whole number, got " + rawDays);
        }
        String statutoryBasis = (String) root.get("statutoryBasis");
        if (statutoryBasis == null || statutoryBasis.isBlank()) {
            throw new IllegalStateException(RESOURCE + ": statutoryBasis is missing");
        }
        this.deadline = new ClaimDeadline((Integer) rawDays,
                Boolean.TRUE.equals(root.get("confirmed")), statutoryBasis);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> load() {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            return (Map<String, Object>) new Yaml().load(in);
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot read " + RESOURCE, ex);
        }
    }

    @Override
    public ClaimDeadline current() {
        return deadline;
    }
}
