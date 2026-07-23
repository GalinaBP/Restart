package ru.restart.app.casefile.infrastructure;

import org.junit.jupiter.api.Test;
import ru.restart.app.casefile.domain.FeeItem;
import ru.restart.app.casefile.domain.FeeLine;
import ru.restart.app.casefile.domain.FeeSchedule;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

/**
 * What the filing costs, read from the real {@code fees.yml} (backlog AI-021).
 *
 * <p>These tests deliberately do NOT pin the amounts to literals: the whole point of the ticket is
 * that the figures are configuration a lawyer will change, and a test asserting «300» would have
 * to be edited every time — turning a config change back into a code change. What is pinned is
 * everything that must hold whatever the numbers are: both fees exist, money keeps its exact
 * scale, the total is the sum of its parts, and unreviewed amounts announce themselves.
 */
class YamlFeeScheduleRegistryTest {

    private final FeeSchedule schedule = new YamlFeeScheduleRegistry().current();

    @Test
    void bothFilingCostsAreConfiguredWithAStatutoryBasis() {
        assertThat(schedule.lines()).extracting(FeeLine::item)
                .containsExactlyInAnyOrder(FeeItem.STATE_DUTY, FeeItem.MANAGER_DEPOSIT);
        assertThat(schedule.lines()).allSatisfy(line -> {
            assertThat(line.amount()).isGreaterThan(BigDecimal.ZERO);
            assertThat(line.statutoryBasis()).isNotBlank();
        });
    }

    @Test
    void theTotalIsTheSumOfTheParts() {
        BigDecimal expected = schedule.lines().stream()
                .map(FeeLine::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(schedule.total()).isEqualByComparingTo(expected);
        assertThat(schedule.total()).isEqualByComparingTo(
                schedule.line(FeeItem.STATE_DUTY).amount()
                        .add(schedule.line(FeeItem.MANAGER_DEPOSIT).amount()));
    }

    @Test
    void amountsAreExactDecimalsRatherThanBinaryFloats() {
        // Money read through a double would land on 25000.000000000004-style values; BigDecimal
        // from the YAML string keeps the configured figure exactly.
        assertThat(schedule.line(FeeItem.MANAGER_DEPOSIT).amount().scale()).isEqualTo(2);
        assertThat(schedule.line(FeeItem.STATE_DUTY).amount().scale()).isEqualTo(2);
    }

    @Test
    void placeholderAmountsAnnounceThemselves() {
        // Until a lawyer signs the figures off, every consumer must be able to tell and say so —
        // this is the one place where a wrong number costs the user real money.
        assertThat(schedule.hasUnconfirmedAmounts()).isTrue();
        assertThat(schedule.lines()).anySatisfy(line -> assertThat(line.confirmed()).isFalse());
    }

    @Test
    void theScheduleCarriesTheDateItAppliesFrom() {
        assertThat(schedule.effectiveFrom()).isNotNull();
    }

    @Test
    void aNegativeAmountIsRejectedOutright() {
        assertThatIllegalArgumentException().isThrownBy(() ->
                new FeeLine(FeeItem.STATE_DUTY, new BigDecimal("-1.00"), true, "тест"));
    }

    @Test
    void askingForAnUnconfiguredFeeFailsLoudly() {
        FeeSchedule partial = new FeeSchedule(schedule.effectiveFrom(),
                List.of(schedule.line(FeeItem.STATE_DUTY)));

        assertThatExceptionOfType(IllegalStateException.class)
                .isThrownBy(() -> partial.line(FeeItem.MANAGER_DEPOSIT));
    }
}
