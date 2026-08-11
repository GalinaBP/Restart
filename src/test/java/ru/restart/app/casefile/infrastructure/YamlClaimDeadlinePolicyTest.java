package ru.restart.app.casefile.infrastructure;

import org.junit.jupiter.api.Test;
import ru.restart.app.casefile.domain.ClaimDeadline;

import static org.assertj.core.api.Assertions.assertThat;

class YamlClaimDeadlinePolicyTest {

    private final ClaimDeadline deadline = new YamlClaimDeadlinePolicy().current();

    @Test
    void thePeriodIsAPositiveWholeNumberOfDays() {
        assertThat(deadline.daysFromPublication()).isPositive();
    }

    @Test
    void thePeriodCarriesAStatutoryBasis() {
        assertThat(deadline.statutoryBasis()).isNotBlank();
    }

    @Test
    void thePlaceholderPeriodAnnouncesItself() {
        assertThat(deadline.confirmed()).isFalse();
    }
}
