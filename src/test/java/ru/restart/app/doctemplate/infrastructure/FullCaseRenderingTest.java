package ru.restart.app.doctemplate.infrastructure;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import ru.restart.app.casefile.CaseFixtures;
import ru.restart.app.casefile.application.CaseModelAssembler;
import ru.restart.app.doctemplate.api.DocumentType;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class FullCaseRenderingTest {

    private final JMustacheTemplateRenderer renderer = new JMustacheTemplateRenderer();
    private final CaseModelAssembler assembler = new CaseModelAssembler(new ObjectMapper(),
            Clock.fixed(Instant.parse("2026-07-17T10:00:00Z"), ZoneOffset.UTC),
            region -> java.util.Optional.empty(),
            ru.restart.app.casefile.infrastructure.FeeScheduleFixture.real());

    private Map<String, Object> assembledModel() {
        return assembler.assemble(CaseFixtures.validCaseSections(UUID.randomUUID()));
    }

    @ParameterizedTest
    @EnumSource(DocumentType.class)
    void everyDocumentRendersFromAssembledCaseData(DocumentType type) {
        String text = renderer.render(type, assembledModel()).text();

        assertThat(text).doesNotContain("{{");
        assertThat(text).contains("ШАБЛОН-ПЛЕЙСХОЛДЕР");
    }

    @Test
    void theApplicationCarriesTheCollectedFacts() {
        String text = renderer.render(DocumentType.BANKRUPTCY_APPLICATION, assembledModel()).text();

        assertThat(text)
                .contains("Иванова Анна Сергеевна")
                .contains("4519")
                .contains("1 250 000,50")
                .contains("85 000,50")
                .contains("17.07.2026");
    }

    @Test
    void theCreditorListEnumeratesCollectedCreditorsWithAbsenceDashes() {
        String text = renderer.render(DocumentType.CREDITOR_LIST, assembledModel()).text();

        assertThat(text)
                .contains("ПАО «Банк Восход»")
                .contains("МФО «Деньги-Быстро»")
                .contains("ИНН: —")
                .contains("Итого кредиторов: 2");
    }
}
