package ru.restart.app.casefile.domain;

public enum DocumentFormat {
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
