package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.ValidationIssue;

import java.time.Instant;
import java.util.List;

/**
 * The blocking response of the generation gate (backlog AI-007): the standard ApiError fields —
 * same shape every other failure has — plus {@code missing}, the exact items to fix. {@code step}
 * is the data-collection section key, so the client can navigate straight from an item to the
 * screen that fixes it; {@code entryIndex}/{@code field} narrow it further when applicable.
 */
public record MissingInfoResponse(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        String correlationId,
        List<MissingItem> missing) {

    public record MissingItem(String step, Integer entryIndex, String field, String code,
                              String message) {

        static MissingItem from(ValidationIssue issue) {
            return new MissingItem(issue.section().name(), issue.entryIndex(), issue.field(),
                    issue.code().name(), issue.message());
        }
    }

    static MissingInfoResponse of(int status, String code, String message, String path,
                                  String correlationId, List<ValidationIssue> issues) {
        return new MissingInfoResponse(Instant.now(), status, code, message, path, correlationId,
                issues.stream().map(MissingItem::from).toList());
    }
}
