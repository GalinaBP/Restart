package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.CaseDocument;

import java.util.UUID;

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
