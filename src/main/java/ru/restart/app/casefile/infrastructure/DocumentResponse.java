package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.CaseDocument;

import java.util.UUID;

/**
 * Metadata of one generated file; the bytes come from the download endpoint. {@code stale} means
 * the case data changed after rendering and currently fails validation — fix the data and the
 * documents regenerate on their own (AI-008).
 */
public record DocumentResponse(
        UUID id,
        String type,
        String format,
        String templateVersion,
        String filename,
        long sizeBytes,
        boolean stale) {

    static DocumentResponse from(CaseDocument document) {
        return new DocumentResponse(document.id(), document.type().name(),
                document.format().name(), document.templateVersion(), document.filename(),
                document.content().length, document.stale());
    }
}
