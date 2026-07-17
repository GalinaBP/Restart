package ru.restart.app.casefile.domain;

/**
 * File formats the generation engine produces. PDF joins later (needs an embedded Cyrillic font —
 * a deliberate follow-up); the writer port keeps the engine format-agnostic per the backlog note.
 */
public enum DocumentFormat {
    TXT("text/plain; charset=utf-8", "txt"),
    DOCX("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx");

    private final String mediaType;
    private final String extension;

    DocumentFormat(String mediaType, String extension) {
        this.mediaType = mediaType;
        this.extension = extension;
    }

    public String mediaType() {
        return mediaType;
    }

    public String extension() {
        return extension;
    }
}
