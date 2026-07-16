package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.application.SectionContent;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

/**
 * One journey step with its collected data. {@code fields} tells the client what the step may
 * contain (the source of the form); {@code data} is null while the step is still empty.
 */
public record SectionContentResponse(
        String key,
        int order,
        boolean repeatable,
        List<String> fields,
        JsonNode data) {

    static SectionContentResponse from(SectionContent content, ObjectMapper objectMapper) {
        JsonNode data = content.payloadJson() == null
                ? null
                : objectMapper.readTree(content.payloadJson());
        return new SectionContentResponse(content.definition().key().name(),
                content.definition().order(), content.definition().repeatable(),
                content.definition().fields(), data);
    }
}
