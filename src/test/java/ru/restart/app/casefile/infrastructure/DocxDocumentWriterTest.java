package ru.restart.app.casefile.infrastructure;

import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import ru.restart.app.doctemplate.api.DocumentType;
import ru.restart.app.doctemplate.api.RenderedDocument;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The hand-built OOXML package must be structurally valid: correct zip parts, well-formed XML,
 * preserved Cyrillic text, and safely escaped markup characters — a malformed file would surface
 * as "Word cannot open this document" for the user at the worst possible moment.
 */
class DocxDocumentWriterTest {

    private final DocxDocumentWriter writer = new DocxDocumentWriter();

    private Map<String, byte[]> unzip(byte[] docx) throws Exception {
        Map<String, byte[]> entries = new HashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(docx))) {
            for (ZipEntry entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                entries.put(entry.getName(), zip.readAllBytes());
            }
        }
        return entries;
    }

    @Test
    void producesTheThreeMandatoryOoxmlParts() throws Exception {
        byte[] docx = writer.write(new RenderedDocument(DocumentType.FILING_CHECKLIST,
                "2026-06-21.1", "Привет!\n\nВторой абзац."));

        Map<String, byte[]> parts = unzip(docx);
        assertThat(new String(docx, 0, 2, StandardCharsets.US_ASCII)).isEqualTo("PK");
        assertThat(parts).containsKeys("[Content_Types].xml", "_rels/.rels", "word/document.xml");
    }

    @Test
    void documentXmlIsWellFormedAndKeepsTheCyrillicText() throws Exception {
        byte[] docx = writer.write(new RenderedDocument(DocumentType.BANKRUPTCY_APPLICATION,
                "2026-06-21.1", "ЗАЯВЛЕНИЕ\n  отступ сохраняется\nИванова Анна"));

        byte[] xml = unzip(docx).get("word/document.xml");
        Document parsed = DocumentBuilderFactory.newInstance().newDocumentBuilder()
                .parse(new ByteArrayInputStream(xml));
        String text = new String(xml, StandardCharsets.UTF_8);

        assertThat(parsed.getDocumentElement().getNodeName()).isEqualTo("w:document");
        assertThat(text)
                .contains("ЗАЯВЛЕНИЕ")
                .contains("Иванова Анна")
                .contains("xml:space=\"preserve\">  отступ сохраняется");
    }

    @Test
    void markupCharactersInTheTextAreEscaped() throws Exception {
        byte[] docx = writer.write(new RenderedDocument(DocumentType.DEBT_SUMMARY,
                "2026-06-21.1", "ООО «Рога & Копыта» <до 100%>"));

        String xml = new String(unzip(docx).get("word/document.xml"), StandardCharsets.UTF_8);

        assertThat(xml).contains("ООО «Рога &amp; Копыта» &lt;до 100%&gt;");
        // And it still parses:
        DocumentBuilderFactory.newInstance().newDocumentBuilder()
                .parse(new ByteArrayInputStream(unzip(docx).get("word/document.xml")));
    }
}
