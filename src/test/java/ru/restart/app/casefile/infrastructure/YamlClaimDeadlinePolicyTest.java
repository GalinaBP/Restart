package ru.restart.app.casefile.infrastructure;

import org.junit.jupiter.api.Test;
import ru.restart.app.casefile.domain.ClaimDeadline;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The claim-filing deadline period, read from the real {@code claim-deadline.yml} (backlog
 * AI-025). Deliberately does NOT pin the number of days to a literal — like
 * {@code YamlFeeScheduleRegistryTest}, the whole point is that a lawyer will change this figure,
 * and a test asserting «60» would turn every config edit back into a code change. What is pinned
 * is everything that must hold whatever the number is: it is a positive whole number, it carries
 * a statutory reference, and an unreviewed period announces itself.
 */
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
        // Until a lawyer signs the figure off, every consumer must be able to tell and say so —
        // a wrong period here means a creditor's claim lands outside the register (AI-025).
        assertThat(deadline.confirmed()).isFalse();
    }
}
