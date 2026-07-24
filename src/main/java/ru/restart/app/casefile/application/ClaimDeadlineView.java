package ru.restart.app.casefile.application;

import java.time.LocalDate;

/**
 * The claim-filing deadline of one case (backlog AI-025). {@code publicationDate} and
 * {@code deadlineDate} are both null until a ЕФРСБ publication date is recorded in the case's
 * EFRSB_PUBLICATION section — there is nothing to compute a deadline from before that.
 *
 * @param confirmed whether a lawyer has signed {@code daysFromPublication} off; false means the
 *                  period is a placeholder and the client must show the deadline as a draft.
 */
public record ClaimDeadlineView(LocalDate publicationDate, LocalDate deadlineDate,
                                int daysFromPublication, boolean confirmed) {
}
