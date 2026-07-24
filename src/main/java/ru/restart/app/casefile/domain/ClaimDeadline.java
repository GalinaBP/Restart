package ru.restart.app.casefile.domain;

import java.util.Objects;

/**
 * The claim-filing deadline period, as configured in {@code casefile/claim-deadline.yml} (backlog
 * AI-025): how many calendar days after the ЕФРСБ publication creditors have to file their claims
 * with the court. A statutory number handled with the same discipline as the filing fees
 * (AI-021): {@code confirmed} is false until a lawyer signs the period off, and every consumer of
 * this value must say so rather than present it as settled.
 */
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
