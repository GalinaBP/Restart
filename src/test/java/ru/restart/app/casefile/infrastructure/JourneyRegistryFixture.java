package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.JourneyRegistry;

public final class JourneyRegistryFixture {

    private JourneyRegistryFixture() {
    }

    public static JourneyRegistry real() {
        return new YamlJourneyRegistry();
    }
}
