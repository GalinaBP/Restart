package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.FeeSchedule;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * What the filing costs. {@code confirmed} is per line and deliberately exposed: while any amount
 * is an unconfirmed placeholder the client must say so rather than present a figure the user
 * might go and pay.
 */
public record FeeScheduleResponse(List<FeeLineResponse> lines, BigDecimal total,
                                  boolean allConfirmed, LocalDate effectiveFrom) {

    public record FeeLineResponse(String item, BigDecimal amount, boolean confirmed,
                                  String statutoryBasis) {
    }

    static FeeScheduleResponse from(FeeSchedule schedule) {
        return new FeeScheduleResponse(
                schedule.lines().stream()
                        .map(line -> new FeeLineResponse(line.item().name(), line.amount(),
                                line.confirmed(), line.statutoryBasis()))
                        .toList(),
                schedule.total(),
                !schedule.hasUnconfirmedAmounts(),
                schedule.effectiveFrom());
    }
}
