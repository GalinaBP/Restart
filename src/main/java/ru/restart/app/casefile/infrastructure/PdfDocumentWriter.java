package ru.restart.app.casefile.infrastructure;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import ru.restart.app.casefile.domain.DocumentFileWriter;
import ru.restart.app.casefile.domain.DocumentFormat;
import ru.restart.app.doctemplate.api.RenderedDocument;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;

@Component
class PdfDocumentWriter implements DocumentFileWriter {

    private static final PDRectangle PAGE = PDRectangle.A4;
    private static final float MARGIN = 50f;
    private static final float FONT_SIZE = 9.5f;
    private static final float LEADING = 13f;

    private final byte[] fontBytes;

    PdfDocumentWriter() {
        try (InputStream in = new ClassPathResource("fonts/DejaVuSansMono.ttf").getInputStream()) {
            this.fontBytes = in.readAllBytes();
        } catch (IOException ex) {
            throw new UncheckedIOException("Embedded PDF font missing", ex);
        }
    }

    @Override
    public DocumentFormat format() {
        return DocumentFormat.PDF;
    }

    @Override
    public byte[] write(RenderedDocument document) {
        try (PDDocument pdf = new PDDocument()) {
            PDType0Font font = PDType0Font.load(pdf,
                    new java.io.ByteArrayInputStream(fontBytes), true);
            float usableWidth = PAGE.getWidth() - 2 * MARGIN;
            float charWidth = font.getStringWidth("0") / 1000 * FONT_SIZE;
            int maxChars = Math.max(20, (int) (usableWidth / charWidth));

            List<String> lines = new ArrayList<>();
            for (String raw : document.text().split("\n", -1)) {
                wrap(sanitize(font, raw), maxChars, lines);
            }

            int perPage = (int) ((PAGE.getHeight() - 2 * MARGIN) / LEADING);
            for (int start = 0; start < Math.max(1, lines.size()); start += perPage) {
                PDPage page = new PDPage(PAGE);
                pdf.addPage(page);
                try (PDPageContentStream content = new PDPageContentStream(pdf, page)) {
                    content.beginText();
                    content.setFont(font, FONT_SIZE);
                    content.setLeading(LEADING);
                    content.newLineAtOffset(MARGIN, PAGE.getHeight() - MARGIN);
                    for (int i = start; i < Math.min(lines.size(), start + perPage); i++) {
                        content.showText(lines.get(i));
                        content.newLine();
                    }
                    content.endText();
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            pdf.save(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot build PDF", ex);
        }
    }

    private static void wrap(String line, int maxChars, List<String> into) {
        if (line.length() <= maxChars) {
            into.add(line);
            return;
        }
        String rest = line;
        while (rest.length() > maxChars) {
            int cut = rest.lastIndexOf(' ', maxChars);
            if (cut <= 0) {
                cut = maxChars;
            }
            into.add(rest.substring(0, cut));
            rest = rest.substring(cut).stripLeading();
        }
        into.add(rest);
    }

    private static String sanitize(PDType0Font font, String line) {
        StringBuilder safe = new StringBuilder(line.length());
        line.codePoints().forEach(codePoint -> {
            String character = new String(Character.toChars(codePoint));
            try {
                font.encode(character);
                safe.append(character);
            } catch (IOException | IllegalArgumentException ex) {
                safe.append('?');
            }
        });
        return safe.toString();
    }
}
