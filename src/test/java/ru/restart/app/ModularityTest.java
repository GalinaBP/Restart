package ru.restart.app;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

/**
 * Verifies the modular-monolith boundaries with Spring Modulith. {@code verify()} fails the build if
 * any module reaches into another module's non-{@code api} internals, or if there is an illegal
 * dependency cycle. Also (re)generates the module documentation under {@code target/}.
 */
class ModularityTest {

    static final ApplicationModules modules = ApplicationModules.of(RestartApplication.class);

    @Test
    void verifiesModuleStructure() {
        modules.verify();
    }

    @Test
    void writesModuleDocumentation() {
        new Documenter(modules).writeDocumentation();
    }
}
