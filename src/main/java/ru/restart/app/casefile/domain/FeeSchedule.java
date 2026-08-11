package ru.restart.app.casefile.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

public record FeeSchedule(LocalDate effectiveFrom, List<FeeLine> lines) {

    public FeeSchedule {
        Objects.requireNonNull(effectiveFrom, "effectiveFrom");
        lines = List.copyOf(Objects.requireNonNull(lines, "lines"));
    }

    public BigDecimal total() {
        return lines.stream().map(FeeLine::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public boolean hasUnconfirmedAmounts() {
        return lines.stream().anyMatch(line -> !line.confirmed());
    }

    public FeeLine line(FeeItem item) {
        return lines.stream()
                .filter(line -> line.item() == item)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No fee configured for " + item));
    }
}
