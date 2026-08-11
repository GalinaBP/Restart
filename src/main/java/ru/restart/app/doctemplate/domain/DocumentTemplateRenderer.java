package ru.restart.app.doctemplate.domain;

import ru.restart.app.doctemplate.api.DocumentType;
import ru.restart.app.doctemplate.api.RenderedDocument;

import java.util.Map;

public interface DocumentTemplateRenderer {

    String activeVersion();

    RenderedDocument render(DocumentType type, Map<String, Object> model);
}
