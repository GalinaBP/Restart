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
