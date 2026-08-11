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
        assertThat(schedule.line(FeeItem.MANAGER_DEPOSIT).amount().scale()).isEqualTo(2);
        assertThat(schedule.line(FeeItem.STATE_DUTY).amount().scale()).isEqualTo(2);
    }

    @Test
    void placeholderAmountsAnnounceThemselves() {
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
