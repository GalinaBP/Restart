package ru.restart.app.casefile.application;

import ru.restart.app.casefile.domain.SectionDefinition;

/** A section with its collected data; {@code payloadJson} is null while the step is still empty. */
public record SectionContent(SectionDefinition definition, String payloadJson) {
}
