package ru.restart.app.doctemplate.infrastructure;

import com.samskivert.mustache.MustacheException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import ru.restart.app.doctemplate.SampleModels;
import ru.restart.app.doctemplate.api.DocumentType;
import ru.restart.app.doctemplate.api.RenderedDocument;

import java.io.UncheckedIOException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

/**
 * Rendering behaviour of the template set: every document renders from the sample case, shared
 * boilerplate really is shared (the partials appear in every output), the version travels with
 * each render, and a broken setup fails fast rather than producing a blank court document.
 */
class JMustacheTemplateRendererTest {

    private final JMustacheTemplateRenderer renderer = new JMustacheTemplateRenderer();

    @Test
    void activeVersionComesFromTheManifest() {
        assertThat(renderer.activeVersion()).isEqualTo("2026-06-21.1");
    }

    @ParameterizedTest
    @EnumSource(DocumentType.class)
    void everyDocumentRendersWithTheSharedBoilerplate(DocumentType type) {
        RenderedDocument document = renderer.render(type, SampleModels.fullCase());

        assertThat(document.templateVersion()).isEqualTo("2026-06-21.1");
        // The draft-warning partial must appear in every document until lawyer sign-off.
        assertThat(document.text()).contains("ШАБЛОН-ПЛЕЙСХОЛДЕР");
        assertThat(document.text()).contains("НЕ ПРЕДНАЗНАЧЕН ДЛЯ ПОДАЧИ В СУД");
        // No unresolved placeholders leak into output.
        assertThat(document.text()).doesNotContain("{{");
    }

    @Test
    void applicationCarriesTheCaseFacts() {
        String text = renderer.render(DocumentType.BANKRUPTCY_APPLICATION,
                SampleModels.fullCase()).text();

        assertThat(text)
                .contains("Арбитражный суд города Москвы")
                .contains("Иванова Анна Сергеевна")
                .contains("4519")
                .contains("1 250 000,00")
                .contains("213.4");
    }

    @Test
    void creditorListEnumeratesEveryCreditor() {
        String text = renderer.render(DocumentType.CREDITOR_LIST, SampleModels.fullCase()).text();

        assertThat(text)
                .contains("ПАО «Банк Восход»")
                .contains("МФО «Деньги-Быстро»")
                .contains("Итого кредиторов: 2");
    }

    @Test
    void propertyInformationRendersAbsenceBranchesForTheNarrowIcp() {
        String text = renderer.render(DocumentType.PROPERTY_INFORMATION,
                SampleModels.fullCase()).text();

        // The sample case (per ICP) has no real estate and no vehicles:
        assertThat(text)
                .contains("Ноутбук Apple MacBook Air 13")
                .contains("Отсутствует.")
                .contains("Отсутствуют.");
    }

    @Test
    void aMissingModelKeyIsAnErrorNotABlankLine() {
        Map<String, Object> incomplete = SampleModels.fullCase();
        incomplete.remove("totalDebt");

        assertThatExceptionOfType(MustacheException.class)
                .isThrownBy(() -> renderer.render(DocumentType.BANKRUPTCY_APPLICATION, incomplete));
    }

    @Test
    void anUnknownTemplateVersionFailsFastAtConstruction() {
        assertThatExceptionOfType(UncheckedIOException.class)
                .isThrownBy(() -> new JMustacheTemplateRenderer("9999-01-01.1"))
                .withMessageContaining("9999-01-01.1");
    }
}
