package ru.restart.app.casefile.domain;

import ru.restart.app.doctemplate.api.RenderedDocument;

/**
 * Turns one rendered document into the bytes of one file format. One implementation per
 * {@link DocumentFormat} (infrastructure); the generation engine iterates over all of them, so a
 * new format is a new bean, not an engine change — the backlog's format-agnostic requirement.
 */
public interface DocumentFileWriter {

    DocumentFormat format();

    byte[] write(RenderedDocument document);
}
