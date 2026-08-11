package ru.restart.app.casefile.domain;

import java.util.Objects;

public record ClaimDeadline(int daysFromPublication, boolean confirmed, String statutoryBasis) {

    public ClaimDeadline {
        Objects.requireNonNull(statutoryBasis, "statutoryBasis");
        if (statutoryBasis.isBlank()) {
            throw new IllegalArgumentException("statutoryBasis must not be blank");
        }
        if (daysFromPublication <= 0) {
            throw new IllegalArgumentException(
                    "daysFromPublication must be positive: " + daysFromPublication);
        }
    }
}
