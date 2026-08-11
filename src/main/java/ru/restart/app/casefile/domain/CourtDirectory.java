package ru.restart.app.casefile.domain;

import java.util.Optional;

@FunctionalInterface
public interface CourtDirectory {

    Optional<String> courtFor(String regionFreeText);
}
