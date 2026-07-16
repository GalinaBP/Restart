package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.application.SectionOverview;

/** One journey step in the overview list. */
public record SectionStatusResponse(String key, int order, boolean repeatable, boolean filled) {

    static SectionStatusResponse from(SectionOverview overview) {
        return new SectionStatusResponse(overview.definition().key().name(),
                overview.definition().order(), overview.definition().repeatable(),
                overview.filled());
    }
}
