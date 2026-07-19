package ru.restart.app.casefile.domain;

import java.util.Optional;

/**
 * Region of registration → the арбитражный суд that hears the citizen's bankruptcy case.
 * Backed by {@code casefile/courts.yml} (placeholder pending lawyer review); empty when the
 * region cannot be recognised — the documents then keep the honest «уточняется» placeholder
 * instead of guessing a court.
 */
@FunctionalInterface
public interface CourtDirectory {

    Optional<String> courtFor(String regionFreeText);
}
