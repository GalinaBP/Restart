package ru.restart.app.architecture;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Fine-grained architecture rules that complement Spring Modulith's module-boundary checks. These
 * assert the internal layering convention (domain → application → infrastructure) and keep the
 * {@code common} module free of dependencies on business modules.
 *
 * <p>Rules use {@code allowEmptyShould(true)} so they remain green while modules are still being
 * scaffolded, and start biting as soon as the relevant packages exist.
 */
class LayeredArchitectureTest {

    private static final String ROOT = "ru.restart.app";
    private static JavaClasses classes;

    @BeforeAll
    static void importClasses() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages(ROOT);
    }

    @Test
    void domainMustNotDependOnInfrastructure() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..domain..")
                .should().dependOnClassesThat().resideInAPackage("..infrastructure..")
                .allowEmptyShould(true);
        rule.check(classes);
    }

    @Test
    void domainMustNotDependOnWebOrPersistenceFrameworks() {
        // Neutral pagination value types (org.springframework.data.domain: Page/Pageable/Sort) are
        // allowed in domain repository interfaces; JPA and web frameworks are not.
        ArchRule rule = noClasses()
                .that().resideInAPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        "org.springframework.web..",
                        "jakarta.persistence..",
                        "org.springframework.data.jpa..",
                        "org.springframework.stereotype..")
                .allowEmptyShould(true);
        rule.check(classes);
    }

    @Test
    void controllersMustNotDependOnSpringDataRepositories() {
        ArchRule rule = noClasses()
                .that().haveSimpleNameEndingWith("Controller")
                .should().dependOnClassesThat().haveSimpleNameEndingWith("Repository")
                .allowEmptyShould(true);
        rule.check(classes);
    }

    @Test
    void commonMustNotDependOnBusinessModules() {
        // Phrased as "any project package that is not common or the root" so the rule automatically
        // covers every business module we add, without maintaining a list here.
        DescribedPredicate<JavaClass> aBusinessModuleClass =
                JavaClass.Predicates.resideInAPackage(ROOT + ".(*)..")
                        .and(DescribedPredicate.not(
                                JavaClass.Predicates.resideInAPackage(ROOT + ".common..")))
                        .as("a business module class");
        ArchRule rule = noClasses()
                .that().resideInAPackage(ROOT + ".common..")
                .should().dependOnClassesThat(aBusinessModuleClass)
                .allowEmptyShould(true);
        rule.check(classes);
    }
}
