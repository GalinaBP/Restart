package ru.restart.app.casefile.domain;

import java.time.LocalDate;

public final class ClaimDeadlineCalculator {

    private ClaimDeadlineCalculator() {
    }

    public static LocalDate deadlineFrom(LocalDate publicationDate, int daysFromPublication) {
        return publicationDate == null ? null : publicationDate.plusDays(daysFromPublication);
    }
}
