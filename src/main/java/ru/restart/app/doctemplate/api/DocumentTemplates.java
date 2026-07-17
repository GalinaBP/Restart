package ru.restart.app.doctemplate.api;

import java.util.Map;

/**
 * What other modules may do with templates: render a document of the active edition from a fully
 * prepared model. Every displayed value in the model is a preformatted string and every key a
 * template references must be present — a missing key is an error, never a blank line in a court
 * document. The reference model shape is documented by {@code SampleModels} in this module's
 * tests.
 */
public interface DocumentTemplates {

    /** The template edition currently in force, e.g. {@code 2026-06-21.1}. */
    String activeVersion();

    RenderedDocument render(DocumentType type, Map<String, Object> model);
}
