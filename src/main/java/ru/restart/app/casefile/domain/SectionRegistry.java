package ru.restart.app.casefile.domain;

import java.util.List;

public interface SectionRegistry {

    List<SectionDefinition> all();

    SectionDefinition get(SectionKey key);
}
