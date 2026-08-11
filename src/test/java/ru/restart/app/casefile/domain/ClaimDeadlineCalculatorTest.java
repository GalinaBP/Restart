package ru.restart.app.casefile.domain;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

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
