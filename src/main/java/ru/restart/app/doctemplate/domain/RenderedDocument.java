package ru.restart.app.doctemplate.domain;

/**
 * The rendered text of one document. {@code templateVersion} is carried with every render so a
 * generated document can always be traced to the exact template edition it came from (backlog
 * AI-005: "template version tracked per generated document").
 */
public record RenderedDocument(DocumentType type, String templateVersion, String text) {
}
