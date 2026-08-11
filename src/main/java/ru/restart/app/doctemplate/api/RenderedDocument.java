package ru.restart.app.doctemplate.api;

public record RenderedDocument(DocumentType type, String templateVersion, String text) {
}
