package ru.restart.app.casefile.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

/**
 * What a filing costs, as configured in {@code casefile/fees.yml} (backlog AI-021). The total is
 * derived, never configured, so the parts and the sum cannot drift apart.
 */
public record FeeSchedule(LocalDate effectiveFrom, List<FeeLine> lines) {

    public FeeSchedule {
        Objects.requireNonNull(effectiveFrom, "effectiveFrom");
        lines = List.copyOf(Objects.requireNonNull(lines, "lines"));
    }

    public BigDecimal total() {
        return lines.stream().map(FeeLine::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * True while any amount is still an unconfirmed placeholder. The UI and the payment
     * instructions must say so plainly — this is the one place where a wrong number costs the
     * user real money.
     */
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
