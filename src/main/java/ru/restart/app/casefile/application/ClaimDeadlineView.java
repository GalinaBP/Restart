package ru.restart.app.casefile.application;

import java.time.LocalDate;

public record ClaimDeadlineView(LocalDate publicationDate, LocalDate deadlineDate,
                                int daysFromPublication, boolean confirmed) {
}
