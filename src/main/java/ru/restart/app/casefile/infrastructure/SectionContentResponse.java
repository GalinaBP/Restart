package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.application.SectionContent;
import ru.restart.app.casefile.domain.FieldDefinition;
import ru.restart.app.casefile.domain.ValidationIssue;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

/**
 * One journey step with its collected data. {@code fields} tells the client what the step may
 * contain and how each value is validated (the source of the form); {@code data} is null while
 * the step is still empty; {@code issues} is what still has to be fixed on this step.
 */
public record SectionContentResponse(
        String key,
        int order,
        boolean repeatable,
        List<FieldView> fields,
        JsonNode data,
        List<ValidationIssueResponse> issues) {

    record FieldView(String name, String type, boolean required) {
        static FieldView from(FieldDefinition field) {
            return new FieldView(field.name(), field.type().name(), field.required());
        }
    }

    static SectionContentResponse from(SectionContent content, List<ValidationIssue> issues,
                                       ObjectMapper objectMapper) {
        JsonNode data = content.payloadJson() == null
                ? null
                : objectMapper.readTree(content.payloadJson());
        return new SectionContentResponse(content.definition().key().name(),
                content.definition().order(), content.definition().repeatable(),
                content.definition().fields().stream().map(FieldView::from).toList(),
                data,
                issues.stream().map(ValidationIssueResponse::from).toList());
    }
}
