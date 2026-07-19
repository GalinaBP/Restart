package ru.restart.app.casefile.infrastructure;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;
import ru.restart.app.casefile.domain.CourtDirectory;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Keyword matcher over {@code casefile/courts.yml}. Entries are tried in file order and the
 * first contained keyword wins — the file's ordering comments explain why (prefix collisions
 * like Московская/Москва). Normalisation keeps matching honest against free-text regions:
 * lowercase and ё→е, nothing fuzzier.
 */
@Component
class YamlCourtDirectory implements CourtDirectory {

    private static final String RESOURCE = "casefile/courts.yml";

    private record Entry(String court, List<String> keywords) {
    }

    private final List<Entry> entries = new ArrayList<>();

    @SuppressWarnings("unchecked")
    YamlCourtDirectory() {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            Map<String, Object> root = new Yaml().load(in);
            for (Map<String, Object> raw : (List<Map<String, Object>>) root.get("courts")) {
                String court = (String) raw.get("court");
                List<String> keywords = ((List<String>) raw.get("keywords")).stream()
                        .map(YamlCourtDirectory::normalize)
                        .toList();
                if (court == null || court.isBlank() || keywords.isEmpty()) {
                    throw new IllegalStateException(RESOURCE + ": entry without court/keywords");
                }
                entries.add(new Entry(court, keywords));
            }
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot read " + RESOURCE, ex);
        }
        if (entries.isEmpty()) {
            throw new IllegalStateException(RESOURCE + " is empty");
        }
    }

    @Override
    public Optional<String> courtFor(String regionFreeText) {
        if (regionFreeText == null || regionFreeText.isBlank()) {
            return Optional.empty();
        }
        String haystack = normalize(regionFreeText);
        for (Entry entry : entries) {
            for (String keyword : entry.keywords()) {
                if (haystack.contains(keyword)) {
                    return Optional.of(entry.court());
                }
            }
        }
        return Optional.empty();
    }

    private static String normalize(String text) {
        return text.toLowerCase(Locale.ROOT).replace('ё', 'е');
    }
}
