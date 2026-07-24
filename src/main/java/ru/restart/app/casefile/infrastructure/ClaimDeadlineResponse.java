package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.application.ClaimDeadlineView;

import java.time.LocalDate;

/**
 * The claim-filing deadline as read by the client (backlog AI-025). {@code confirmed} is
 * deliberately exposed: while the period is an unreviewed placeholder, the client must say so
 * rather than present a date the user might rely on to avoid missing the deadline.
 */
public record ClaimDeadlineResponse(LocalDate publicationDate, LocalDate deadlineDate,
                                    int daysFromPublication, boolean confirmed) {

    static ClaimDeadlineResponse from(ClaimDeadlineView view) {
        return new ClaimDeadlineResponse(view.publicationDate(), view.deadlineDate(),
                view.daysFromPublication(), view.confirmed());
    }
}
