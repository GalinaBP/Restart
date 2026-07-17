package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.CaseDocument;

import java.util.UUID;

/** Metadata of one generated file; the bytes come from the download endpoint. */
public record DocumentResponse(
        UUID id,
        String type,
        String format,
        String templateVersion,
        String filename,
        long sizeBytes) {

    static DocumentResponse from(CaseDocument document) {
        return new DocumentResponse(document.id(), document.type().name(),
                document.format().name(), document.templateVersion(), document.filename(),
                document.content().length);
    }
}
