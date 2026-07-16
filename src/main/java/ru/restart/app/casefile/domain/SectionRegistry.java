package ru.restart.app.casefile.domain;

import java.util.List;

/**
 * The configured set of data-collection sections. Implemented in infrastructure by loading
 * {@code casefile/sections.yml}; behind an interface so the domain and application layers are
 * independent of how definitions are stored.
 */
public interface SectionRegistry {

    /** All sections in journey order. Every {@link SectionKey} is present exactly once. */
    List<SectionDefinition> all();

    SectionDefinition get(SectionKey key);
}
