package ru.restart.app.casefile.domain;

import ru.restart.app.doctemplate.api.RenderedDocument;

public interface DocumentFileWriter {

    DocumentFormat format();

    byte[] write(RenderedDocument document);
}
