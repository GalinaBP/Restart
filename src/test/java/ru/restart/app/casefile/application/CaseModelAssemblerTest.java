package ru.restart.app.casefile.application;

import org.junit.jupiter.api.Test;
import ru.restart.app.casefile.CaseFixtures;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Mapping and formatting rules from collected JSON to the template model contract. */
class CaseModelAssemblerTest {

    /** Directory stub: recognises Москва, knows nothing else — both branches get exercised. */
    private final CaseModelAssembler assembler = new CaseModelAssembler(new ObjectMapper(),
            Clock.fixed(Instant.parse("2026-07-17T10:00:00Z"), ZoneOffset.UTC),
            region -> region.toLowerCase().contains("москв")
                    ? java.util.Optional.of("Арбитражный суд города Москвы")
                    : java.util.Optional.empty());

    private Map<String, Object> model() {
        return assembler.assemble(CaseFixtures.validCaseSections(UUID.randomUUID()));
    }

    @Test
    @SuppressWarnings("unchecked")
    void applicantIsComposedFromFourSections() {
        Map<String, Object> applicant = (Map<String, Object>) model().get("applicant");

        assertThat(applicant.get("fullName")).isEqualTo("Иванова Анна Сергеевна");
        assertThat(applicant.get("shortName")).isEqualTo("А. С. Иванова");
        assertThat(applicant.get("birthDate")).isEqualTo("20.05.1999");
        assertThat(applicant.get("passportSeries")).isEqualTo("4519");
        assertThat(applicant.get("passportIssueDate")).isEqualTo("14.06.2019");
        assertThat(applicant.get("address"))
                .isEqualTo("101000, г. Москва, Москва, ул. Ленина, д. 1, кв. 2");
        assertThat(applicant.get("phone")).isEqualTo("+7 900 000-00-00");
    }

    @Test
    @SuppressWarnings("unchecked")
    void creditorsAreIndexedFormattedAndTotalled() {
        Map<String, Object> model = model();
        List<Map<String, Object>> creditors = (List<Map<String, Object>>) model.get("creditors");

        assertThat(creditors).hasSize(2);
        assertThat(creditors.get(0))
                .containsEntry("index", "1")
                .containsEntry("debtAmount", "1 000 000,00");
        // The second creditor has no INN and no debt type — rendered as "—", never blank:
        assertThat(creditors.get(1))
                .containsEntry("index", "2")
                .containsEntry("inn", "—")
                .containsEntry("debtType", "—")
                .containsEntry("debtAmount", "250 000,50");
        assertThat(model.get("creditorCount")).isEqualTo("2");
        assertThat(model.get("totalDebt")).isEqualTo("1 250 000,50");
    }

    @Test
    void absentOptionalSectionsBecomeEmptyLists() {
        Map<String, Object> model = model();

        assertThat((List<?>) model.get("propertyItems")).isEmpty();
        assertThat((List<?>) model.get("realEstate")).isEmpty();
        assertThat((List<?>) model.get("vehicles")).isEmpty();
        assertThat((List<?>) model.get("bankAccounts")).isEmpty();
    }

    @Test
    void generatedDateComesFromTheClockAndTheCourtFromTheRegistrationRegion() {
        Map<String, Object> model = model();

        assertThat(model.get("generatedDate")).isEqualTo("17.07.2026");
        // The fixture is registered in Москва — the directory resolves the court:
        assertThat(model.get("court")).isEqualTo(Map.of("name", "Арбитражный суд города Москвы"));
    }

    @Test
    void anUnrecognisedRegionKeepsTheHonestCourtPlaceholder() {
        List<ru.restart.app.casefile.domain.CaseSection> sections =
                CaseFixtures.validCaseSections(UUID.randomUUID()).stream()
                        .map(s -> s.key() == ru.restart.app.casefile.domain.SectionKey.REGISTRATION_ADDRESS
                                ? s.withPayload("{\"region\": \"Атлантида\", \"city\": \"Посейдонис\", "
                                + "\"street\": \"ул. Морская\", \"house\": \"д. 1\"}")
                                : s)
                        .toList();

        Map<String, Object> model = assembler.assemble(sections);

        assertThat(model.get("court"))
                .isEqualTo(Map.of("name", CaseModelAssembler.COURT_PLACEHOLDER));
    }

    @Test
    void moneyFormattingGroupsAndRounds() {
        assertThat(CaseModelAssembler.formatMoney(new BigDecimal("0"))).isEqualTo("0,00");
        assertThat(CaseModelAssembler.formatMoney(new BigDecimal("999"))).isEqualTo("999,00");
        assertThat(CaseModelAssembler.formatMoney(new BigDecimal("1000"))).isEqualTo("1 000,00");
        assertThat(CaseModelAssembler.formatMoney(new BigDecimal("1234567.895")))
                .isEqualTo("1 234 567,90");
    }
}
