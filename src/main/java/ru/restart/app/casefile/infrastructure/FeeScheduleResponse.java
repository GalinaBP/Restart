package ru.restart.app.casefile.infrastructure;

import ru.restart.app.casefile.domain.FeeSchedule;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

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
