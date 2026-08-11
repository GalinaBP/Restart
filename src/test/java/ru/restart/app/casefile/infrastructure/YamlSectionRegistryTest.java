package ru.restart.app.casefile.infrastructure;

import org.junit.jupiter.api.Test;
import ru.restart.app.casefile.domain.FieldType;
import ru.restart.app.casefile.domain.SectionDefinition;
import ru.restart.app.casefile.domain.SectionKey;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class YamlSectionRegistryTest {

    private final YamlSectionRegistry registry = new YamlSectionRegistry();

    @Test
    void everySectionKeyIsDefinedExactlyOnceInJourneyOrder() {
        List<SectionDefinition> all = registry.all();

        assertThat(all).hasSize(SectionKey.values().length);
        assertThat(all.stream().map(SectionDefinition::key))
                .containsExactlyInAnyOrder(SectionKey.values());
        assertThat(all.stream().map(SectionDefinition::order))
                .isSorted()
                .doesNotHaveDuplicates();
    }

    @Test
    void everySectionHasFieldsAndAStatutoryBasis() {
        for (SectionDefinition definition : registry.all()) {
            assertThat(definition.fields()).as("fields of %s", definition.key()).isNotEmpty();
            assertThat(definition.statutoryBasis())
                    .as("statutory basis of %s", definition.key()).isNotBlank();
        }
    }

    @Test
    void validationRulesAreConfigured() {
        assertThat(registry.get(SectionKey.PASSPORT).mandatory()).isTrue();
        assertThat(registry.get(SectionKey.VEHICLES).mandatory()).isFalse();
        assertThat(registry.get(SectionKey.CREDITORS).uniqueBy()).containsExactly("name", "inn");
        assertThat(registry.get(SectionKey.CREDITORS).fields())
                .filteredOn(f -> f.name().equals("address"))
                .singleElement()
                .satisfies(f -> assertThat(f.required()).isTrue());
        assertThat(registry.get(SectionKey.PASSPORT).fields())
                .filteredOn(f -> f.name().equals("series"))
                .singleElement()
                .satisfies(f -> assertThat(f.type()).isEqualTo(FieldType.PASSPORT_SERIES));
    }

    @Test
    void repeatabilityMatchesTheDataShape() {
        assertThat(registry.get(SectionKey.PASSPORT).repeatable()).isFalse();
        assertThat(registry.get(SectionKey.PERSONAL_DETAILS).repeatable()).isFalse();
        assertThat(registry.get(SectionKey.CREDITORS).repeatable()).isTrue();
        assertThat(registry.get(SectionKey.VEHICLES).repeatable()).isTrue();
    }
}
