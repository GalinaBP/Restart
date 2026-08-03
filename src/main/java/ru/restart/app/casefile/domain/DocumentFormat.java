package ru.restart.app.casefile.domain;

/**
 * File formats the generation engine produces. The writer port keeps the engine format-agnostic
 * per the backlog note: each value here has exactly one writer bean in infrastructure.
 *
 * <p>PDF only since 2026-08-03. TXT and DOCX were dropped because an editable copy invites
 * hand-editing, and a document edited outside the app silently stops matching the case data it
 * was generated from — while «Мой арбитр», the online filing route, wants PDF anyway.
 */
public enum DocumentFormat {
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
