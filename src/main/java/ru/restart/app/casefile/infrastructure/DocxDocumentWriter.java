package ru.restart.app.casefile.infrastructure;

import org.springframework.stereotype.Component;
import ru.restart.app.casefile.domain.DocumentFileWriter;
import ru.restart.app.casefile.domain.DocumentFormat;
import ru.restart.app.doctemplate.api.RenderedDocument;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Minimal, dependency-free DOCX writer. A .docx is an OOXML package — a zip with a content-types
 * part, a relationships part, and the document body — and our documents are preformatted
 * monospaced text, so hand-building the three XML parts is smaller and more deterministic than a
 * full word-processing library. One paragraph per template line, monospaced font, spaces
 * preserved; Cyrillic needs nothing special because the XML is UTF-8.
 */
@Component
class DocxDocumentWriter implements DocumentFileWriter {

    private static final String CONTENT_TYPES = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
              <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
              <Default Extension="xml" ContentType="application/xml"/>
              <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
            </Types>
            """;

    private static final String RELS = """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
              <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
            </Relationships>
            """;

    private static final String RUN_PROPERTIES =
            "<w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\"/>"
                    + "<w:sz w:val=\"20\"/></w:rPr>";

    @Override
    public DocumentFormat format() {
        return DocumentFormat.DOCX;
    }

    @Override
    public byte[] write(RenderedDocument document) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out, StandardCharsets.UTF_8)) {
            entry(zip, "[Content_Types].xml", CONTENT_TYPES);
            entry(zip, "_rels/.rels", RELS);
            entry(zip, "word/document.xml", documentXml(document.text()));
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot build DOCX", ex);
        }
        return out.toByteArray();
    }

    private static void entry(ZipOutputStream zip, String name, String content) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private static String documentXml(String text) {
        StringBuilder body = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            body.append("<w:p><w:pPr>").append(RUN_PROPERTIES).append("</w:pPr>");
            if (!line.isEmpty()) {
                body.append("<w:r>").append(RUN_PROPERTIES)
                        .append("<w:t xml:space=\"preserve\">").append(escape(line))
                        .append("</w:t></w:r>");
            }
            body.append("</w:p>");
        }
        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">"
                + "<w:body>" + body + "</w:body></w:document>";
    }

    private static String escape(String line) {
        return line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
