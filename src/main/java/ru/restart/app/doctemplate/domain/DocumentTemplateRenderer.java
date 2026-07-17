package ru.restart.app.doctemplate.domain;

import ru.restart.app.doctemplate.api.DocumentType;
import ru.restart.app.doctemplate.api.RenderedDocument;

import java.util.Map;

/**
 * Rendering port: the active template version applied to a prepared model. Implemented in
 * infrastructure (Mustache); the engine is strictly logic-less — every displayed value, total,
 * and counter is precomputed in the model by the caller (the generation engine, AI-006).
 */
public interface DocumentTemplateRenderer {

    /** The template edition currently in force, e.g. {@code 2026-06-21.1}. */
    String activeVersion();

    /**
     * Renders one document from the active version. The model must contain every key the template
     * references — a missing key is an error, not an empty string, so template/model drift is
     * caught in tests rather than shipped as a blank line in a court filing.
     */
    RenderedDocument render(DocumentType type, Map<String, Object> model);
}
