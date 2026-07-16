package ru.restart.app.casefile.application;

import ru.restart.app.casefile.domain.SectionDefinition;

/** One row of the journey overview: a section and whether the case has data for it yet. */
public record SectionOverview(SectionDefinition definition, boolean filled) {
}
