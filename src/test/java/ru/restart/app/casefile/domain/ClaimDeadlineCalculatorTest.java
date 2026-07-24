package ru.restart.app.casefile.domain;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The ticket's required unit coverage: deadline calculation from the ЕФРСБ publication date
 * (backlog AI-025). Pure function, no Spring context — a known date plus a known period must
 * yield a known deadline, in plain calendar days (weekends and holidays included), and a missing
 * publication date must yield no deadline at all rather than a guess.
 */
class ClaimDeadlineCalculatorTest {

    @Test
    void aKnownPublicationDatePlusTheConfiguredPeriodYieldsTheDeadline() {
        LocalDate publicationDate = LocalDate.parse("2026-06-01");

        LocalDate deadline = ClaimDeadlineCalculator.deadlineFrom(publicationDate, 60);

        assertThat(deadline).isEqualTo(LocalDate.parse("2026-07-31"));
    }

    @Test
    void noPublicationDateYieldsNoDeadline() {
        assertThat(ClaimDeadlineCalculator.deadlineFrom(null, 60)).isNull();
    }

    @Test
    void thePeriodIsCalendarDaysNotBusinessDays() {
        // 2026-07-24 is a Friday; +2 calendar days lands on Sunday 2026-07-26, not the following
        // Monday — confirming weekends are not skipped.
        LocalDate friday = LocalDate.parse("2026-07-24");

        LocalDate deadline = ClaimDeadlineCalculator.deadlineFrom(friday, 2);

        assertThat(deadline).isEqualTo(LocalDate.parse("2026-07-26"));
    }

    @Test
    void aZeroDayPeriodReturnsThePublicationDateItself() {
        LocalDate publicationDate = LocalDate.parse("2026-01-15");

        assertThat(ClaimDeadlineCalculator.deadlineFrom(publicationDate, 0))
                .isEqualTo(publicationDate);
    }
}
