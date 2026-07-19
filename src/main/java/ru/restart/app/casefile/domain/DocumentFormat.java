package ru.restart.app.casefile.domain;

/**
 * File formats the generation engine produces. The writer port keeps the engine format-agnostic
 * per the backlog note: each value here has exactly one writer bean in infrastructure.
 */
public enum DocumentFormat {
    TXT("text/plain; charset=utf-8", "txt"),
    DOCX("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"),
    /** Cyrillic via the embedded DejaVu Sans Mono (resources/fonts). */
    PDF("application/pdf", "pdf");

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
