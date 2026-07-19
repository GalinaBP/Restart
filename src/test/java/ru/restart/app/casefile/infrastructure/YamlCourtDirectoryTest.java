package ru.restart.app.casefile.infrastructure;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The region → court matcher: real-world free-text region spellings resolve to the right court,
 * the documented prefix collisions stay resolved by file order, and anything unrecognised stays
 * empty so the documents keep the honest placeholder. (Court names themselves are placeholder
 * pending lawyer review — see docs/lawyer-review.md, item 5.)
 */
class YamlCourtDirectoryTest {

    private final YamlCourtDirectory directory = new YamlCourtDirectory();

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "г. Москва                          | Арбитражный суд города Москвы",
            "Москва                             | Арбитражный суд города Москвы",
            "Московская область                 | Арбитражный суд Московской области",
            "Санкт-Петербург                    | Арбитражный суд города Санкт-Петербурга и Ленинградской области",
            "Ленинградская область              | Арбитражный суд города Санкт-Петербурга и Ленинградской области",
            "Нижегородская область              | Арбитражный суд Нижегородской области",
            "г. Нижний Новгород                 | Арбитражный суд Нижегородской области",
            "Новгородская область               | Арбитражный суд Новгородской области",
            "Томская область                    | Арбитражный суд Томской области",
            "Омская область                     | Арбитражный суд Омской области",
            "Алтайский край                     | Арбитражный суд Алтайского края",
            "Республика Алтай                   | Арбитражный суд Республики Алтай",
            "Сахалинская область                | Арбитражный суд Сахалинской области",
            "Республика Саха (Якутия)           | Арбитражный суд Республики Саха (Якутия)",
            "Ямало-Ненецкий автономный округ    | Арбитражный суд Ямало-Ненецкого автономного округа",
            "Ненецкий автономный округ          | Арбитражный суд Архангельской области",
            "Орёл                               | Арбитражный суд Орловской области",
            "Свердловская область, Екатеринбург | Арбитражный суд Свердловской области",
            "Республика Татарстан               | Арбитражный суд Республики Татарстан",
    })
    void resolvesRealWorldRegionSpellings(String region, String expectedCourt) {
        assertThat(directory.courtFor(region)).hasValue(expectedCourt.trim());
    }

    @Test
    void unknownOrBlankRegionsStayEmpty() {
        assertThat(directory.courtFor("Атлантида")).isEmpty();
        assertThat(directory.courtFor("")).isEmpty();
        assertThat(directory.courtFor(null)).isEmpty();
    }
}
