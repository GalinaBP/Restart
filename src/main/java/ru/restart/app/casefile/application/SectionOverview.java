package ru.restart.app.casefile.application;

import ru.restart.app.casefile.domain.SectionDefinition;

public record SectionOverview(SectionDefinition definition, boolean filled) {
}
