package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.JourneyRegistry;

/**
 * Hands out the real {@code journey.yml}-backed registry to tests outside this package. Unit tests
 * of the journey run against the actual configured procedure rather than a hand-built stub, so a
 * config change that breaks the state machine fails the tests instead of hiding behind a fake.
 */
public final class JourneyRegistryFixture {

    private JourneyRegistryFixture() {
    }

    public static JourneyRegistry real() {
        return new YamlJourneyRegistry();
    }
}
