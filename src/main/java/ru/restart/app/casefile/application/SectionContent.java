package ru.restart.app.casefile.application;

import ru.restart.app.casefile.domain.SectionDefinition;

public record SectionContent(SectionDefinition definition, String payloadJson) {
}
