package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.application.ClaimDeadlineView;

import java.time.LocalDate;

public record ClaimDeadlineResponse(LocalDate publicationDate, LocalDate deadlineDate,
                                    int daysFromPublication, boolean confirmed) {

    static ClaimDeadlineResponse from(ClaimDeadlineView view) {
        return new ClaimDeadlineResponse(view.publicationDate(), view.deadlineDate(),
                view.daysFromPublication(), view.confirmed());
    }
}
