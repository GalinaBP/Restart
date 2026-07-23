package ru.restart.app.casefile.domain;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * One line of what the filing costs (backlog AI-021).
 *
 * @param confirmed whether a lawyer has signed the amount off. False means the figure is a
 *                  placeholder and must be shown to the user as a draft — see {@code fees.yml}.
 */
public record FeeLine(FeeItem item, BigDecimal amount, boolean confirmed, String statutoryBasis) {

    public FeeLine {
        Objects.requireNonNull(item, "item");
        Objects.requireNonNull(amount, "amount");
        Objects.requireNonNull(statutoryBasis, "statutoryBasis");
        if (amount.signum() < 0) {
            throw new IllegalArgumentException("Fee amount cannot be negative: " + item);
        }
    }
}
