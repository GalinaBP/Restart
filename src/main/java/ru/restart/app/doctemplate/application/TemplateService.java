package ru.restart.app.doctemplate.application;

import org.springframework.stereotype.Service;
import ru.restart.app.doctemplate.api.DocumentTemplates;
import ru.restart.app.doctemplate.api.DocumentType;
import ru.restart.app.doctemplate.api.RenderedDocument;
import ru.restart.app.doctemplate.domain.DocumentTemplateRenderer;

import java.util.Map;

@Service
public class TemplateService implements DocumentTemplates {

    private final DocumentTemplateRenderer renderer;

    public TemplateService(DocumentTemplateRenderer renderer) {
        this.renderer = renderer;
    }

    @Override
    public String activeVersion() {
        return renderer.activeVersion();
    }

    @Override
    public RenderedDocument render(DocumentType type, Map<String, Object> model) {
        return renderer.render(type, model);
    }
}
