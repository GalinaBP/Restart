package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.FeeScheduleRegistry;

public final class FeeScheduleFixture {

    private FeeScheduleFixture() {
    }

    public static FeeScheduleRegistry real() {
        return new YamlFeeScheduleRegistry();
    }
}
