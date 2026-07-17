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

/**
 * The Builder → Templates contract (backlog AI-006 integration requirement): a model assembled
 * from REAL collected case data renders through the REAL active templates. Because the renderer
 * treats a missing model key as an error, this test breaks immediately when a template starts
 * referencing data the assembler does not provide — before any user does.
 */
class FullCaseRenderingTest {

    private final JMustacheTemplateRenderer renderer = new JMustacheTemplateRenderer();
    private final CaseModelAssembler assembler = new CaseModelAssembler(new ObjectMapper(),
            Clock.fixed(Instant.parse("2026-07-17T10:00:00Z"), ZoneOffset.UTC));

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
                .contains("4519")                     // passport series
                .contains("1 250 000,50")             // total from the two creditors
                .contains("85 000,50")                // monthly income
                .contains("17.07.2026");              // generation date from the fixed clock
    }

    @Test
    void theCreditorListEnumeratesCollectedCreditorsWithAbsenceDashes() {
        String text = renderer.render(DocumentType.CREDITOR_LIST, assembledModel()).text();

        assertThat(text)
                .contains("ПАО «Банк Восход»")
                .contains("МФО «Деньги-Быстро»")
                .contains("ИНН: —")                   // the MFO fixture has no INN
                .contains("Итого кредиторов: 2");
    }
}
