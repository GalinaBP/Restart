package ru.restart.app.casefile.domain;

import java.math.BigDecimal;
import java.util.Objects;

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
