package ru.restart.app.doctemplate.application;

import org.springframework.stereotype.Service;
import ru.restart.app.doctemplate.domain.DocumentTemplateRenderer;
import ru.restart.app.doctemplate.domain.DocumentType;
import ru.restart.app.doctemplate.domain.RenderedDocument;

import java.util.Map;

/**
 * Use-case entry point of the template module: render one document, or the whole six-document
 * filing package, from prepared models. Consumed by the document-generation engine (AI-006).
 */
@Service
public class TemplateService {

    private final DocumentTemplateRenderer renderer;

    public TemplateService(DocumentTemplateRenderer renderer) {
        this.renderer = renderer;
    }

    public String activeVersion() {
        return renderer.activeVersion();
    }

    public RenderedDocument render(DocumentType type, Map<String, Object> model) {
        return renderer.render(type, model);
    }
}
