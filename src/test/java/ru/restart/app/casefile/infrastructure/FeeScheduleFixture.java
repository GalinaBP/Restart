package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.FeeScheduleRegistry;

/**
 * Hands out the real {@code fees.yml}-backed registry to tests outside this package, so amounts
 * are asserted against the actual configured figures rather than a stub that could quietly
 * disagree with what ships.
 */
public final class FeeScheduleFixture {

    private FeeScheduleFixture() {
    }

    public static FeeScheduleRegistry real() {
        return new YamlFeeScheduleRegistry();
    }
}
