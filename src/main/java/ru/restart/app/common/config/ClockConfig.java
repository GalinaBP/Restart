package ru.restart.app.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * Provides an injectable UTC {@link Clock}. Domain and application code must depend on this rather
 * than {@code Instant.now()} directly, so time can be controlled in tests.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
