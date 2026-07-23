package ru.restart.app.casefile.infrastructure;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;
import ru.restart.app.casefile.domain.FeeItem;
import ru.restart.app.casefile.domain.FeeLine;
import ru.restart.app.casefile.domain.FeeSchedule;
import ru.restart.app.casefile.domain.FeeScheduleRegistry;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

/**
 * Loads what a filing costs from {@code casefile/fees.yml} at startup and fails fast on an
 * inconsistent config: every {@link FeeItem} must be configured exactly once with an amount and a
 * statutory reference. Amounts are read as strings into {@link BigDecimal} — money never goes
 * through a double.
 */
@Component
class YamlFeeScheduleRegistry implements FeeScheduleRegistry {

    private static final String RESOURCE = "casefile/fees.yml";

    private final FeeSchedule schedule;

    YamlFeeScheduleRegistry() {
        Map<String, Object> root = load();
        LocalDate effectiveFrom = LocalDate.parse(String.valueOf(root.get("effectiveFrom")));
        List<FeeLine> lines = new ArrayList<>();
        EnumSet<FeeItem> seen = EnumSet.noneOf(FeeItem.class);
        for (Map<String, Object> raw : items(root)) {
            FeeItem item = FeeItem.valueOf(String.valueOf(raw.get("key")));
            if (!seen.add(item)) {
                throw new IllegalStateException(RESOURCE + ": duplicate fee " + item);
            }
            Object amount = raw.get("amount");
            if (amount == null) {
                throw new IllegalStateException(RESOURCE + ": fee " + item + " has no amount");
            }
            // An unquoted 25000.00 is parsed as a double and would reach BigDecimal as "25000.0".
            // Refuse it rather than silently storing money that lost its scale.
            if (amount instanceof Double || amount instanceof Float) {
                throw new IllegalStateException(RESOURCE + ": amount of " + item
                        + " must be quoted in the YAML so it is not parsed as a floating-point"
                        + " number — write amount: \"" + amount + "\"");
            }
            String statutoryBasis = (String) raw.get("statutoryBasis");
            if (statutoryBasis == null || statutoryBasis.isBlank()) {
                throw new IllegalStateException(
                        RESOURCE + ": fee " + item + " has no statutoryBasis");
            }
            lines.add(new FeeLine(item, new BigDecimal(String.valueOf(amount)),
                    Boolean.TRUE.equals(raw.get("confirmed")), statutoryBasis));
        }
        for (FeeItem item : FeeItem.values()) {
            if (!seen.contains(item)) {
                throw new IllegalStateException(RESOURCE + ": missing fee " + item);
            }
        }
        this.schedule = new FeeSchedule(effectiveFrom, lines);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> load() {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            return (Map<String, Object>) new Yaml().load(in);
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot read " + RESOURCE, ex);
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> items(Map<String, Object> root) {
        List<Map<String, Object>> items = (List<Map<String, Object>>) root.get("items");
        if (items == null || items.isEmpty()) {
            throw new IllegalStateException(RESOURCE + ": no items configured");
        }
        return items;
    }

    @Override
    public FeeSchedule current() {
        return schedule;
    }
}
