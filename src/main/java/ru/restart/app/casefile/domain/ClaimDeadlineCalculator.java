package ru.restart.app.casefile.domain;

import java.time.LocalDate;

/**
 * Pure calculation of the claim-filing deadline from the ЕФРСБ publication date (backlog AI-025).
 * No I/O, no clock: the period comes from {@link ClaimDeadlinePolicy}, the publication date from
 * the case's EFRSB_PUBLICATION section. Deliberately calendar days via {@link LocalDate#plusDays},
 * not business days — the statutory period itself is a {@link ClaimDeadlinePolicy} question, not
 * this calculator's.
 */
public final class ClaimDeadlineCalculator {

    private ClaimDeadlineCalculator() {
    }

    /**
     * The deadline, or {@code null} when there is no publication date on file yet — nothing to
     * compute a deadline from.
     */
    public static LocalDate deadlineFrom(LocalDate publicationDate, int daysFromPublication) {
        return publicationDate == null ? null : publicationDate.plusDays(daysFromPublication);
    }
}
