package ru.restart.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.modulith.Modulithic;

/**
 * Entry point for Restart — a consumer app that guides a user through the Russian personal
 * bankruptcy procedure step by step.
 *
 * <p>The application is a <strong>modular monolith</strong>: a single Spring Boot deployment split
 * into feature modules that communicate only through each other's public {@code api} package and
 * Spring application events. Boundaries are verified by Spring Modulith and ArchUnit tests.
 */
@Modulithic(systemName = "Restart", sharedModules = "common")
@SpringBootApplication
public class RestartApplication {

    public static void main(String[] args) {
        SpringApplication.run(RestartApplication.class, args);
    }
}
