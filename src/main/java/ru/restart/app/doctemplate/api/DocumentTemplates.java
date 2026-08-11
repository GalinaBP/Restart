package ru.restart.app.doctemplate.api;

import java.util.Map;

public interface DocumentTemplates {

    String activeVersion();

    RenderedDocument render(DocumentType type, Map<String, Object> model);
}
