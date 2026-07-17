package ru.restart.app.casefile.infrastructure;

import org.springframework.stereotype.Component;
import ru.restart.app.casefile.domain.DocumentFileWriter;
import ru.restart.app.casefile.domain.DocumentFormat;
import ru.restart.app.doctemplate.api.RenderedDocument;

import java.nio.charset.StandardCharsets;

/** Plain UTF-8 text — the rendered template verbatim. */
@Component
class TxtDocumentWriter implements DocumentFileWriter {

    @Override
    public DocumentFormat format() {
        return DocumentFormat.TXT;
    }

    @Override
    public byte[] write(RenderedDocument document) {
        return document.text().getBytes(StandardCharsets.UTF_8);
    }
}
