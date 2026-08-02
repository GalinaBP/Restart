package ru.restart.app.casefile.infrastructure;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import ru.restart.app.doctemplate.api.DocumentType;
import ru.restart.app.doctemplate.api.RenderedDocument;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The PDF must be a real, text-extractable PDF with working Cyrillic (the embedded DejaVu font —
 * PDFBox's built-in fonts cannot encode it), paginate long documents, and survive characters the
 * font lacks instead of failing the whole filing package.
 */
class PdfDocumentWriterTest {

    private final PdfDocumentWriter writer = new PdfDocumentWriter();

    private String extractText(byte[] pdf) throws Exception {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(document);
        }
    }

    @Test
    void producesARealPdfWithTheCyrillicContent() throws Exception {
        byte[] pdf = writer.write(new RenderedDocument(DocumentType.BANKRUPTCY_APPLICATION,
                "2026-06-21.1", "ЗАЯВЛЕНИЕ\nо признании гражданина несостоятельным (банкротом)\n"
                + "Иванова Анна Сергеевна — 1 250 000,50 руб. по ст. 213.4 № 127-ФЗ"));

        assertThat(new String(pdf, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
        String text = extractText(pdf);
        assertThat(text)
                .contains("ЗАЯВЛЕНИЕ")
                .contains("Иванова Анна Сергеевна")
                .contains("1 250 000,50")
                .contains("№ 127-ФЗ");
    }

    @Test
    void longDocumentsPaginate() throws Exception {
        String longText = "строка про долги и кредиторов\n".repeat(200);
        byte[] pdf = writer.write(new RenderedDocument(DocumentType.CREDITOR_LIST,
                "2026-06-21.1", longText));

        try (PDDocument document = Loader.loadPDF(pdf)) {
            assertThat(document.getNumberOfPages()).isGreaterThan(1);
        }
        assertThat(extractText(pdf)).contains("строка про долги");
    }

    @Test
    void overlongLinesWrapInsteadOfOverflowing() throws Exception {
        String longLine = "кредитор ".repeat(30).trim();
        byte[] pdf = writer.write(new RenderedDocument(DocumentType.CREDITOR_LIST,
                "2026-06-21.1", longLine));

        // All words survive; PDFTextStripper sees them across the wrapped lines.
        assertThat(extractText(pdf).replaceAll("\\s+", " ")).contains("кредитор кредитор");
    }

    @Test
    void charactersOutsideTheFontBecomeQuestionMarksNotFailures() throws Exception {
        byte[] pdf = writer.write(new RenderedDocument(DocumentType.FILING_CHECKLIST,
                "2026-06-21.1", "Привет 🚀 и удачи!"));

        String text = extractText(pdf);
        assertThat(text).contains("Привет").contains("и удачи!").doesNotContain("🚀");
    }
}
