package ru.restart.app.casefile.infrastructure;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.restart.app.casefile.application.CaseService;
import ru.restart.app.casefile.domain.FeeScheduleRegistry;
import ru.restart.app.common.web.ApiPaths;

import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1 + "/cases/{caseId}/fees")
@Tag(name = "Case fees", description = "State duty and manager's deposit for the filing")
public class FeeController {

    private final CaseService cases;
    private final FeeScheduleRegistry fees;

    public FeeController(CaseService cases, FeeScheduleRegistry fees) {
        this.cases = cases;
        this.fees = fees;
    }

    @Operation(summary = "What the filing costs",
            description = "The duty and the deposit with their statutory basis and a total. "
                    + "`allConfirmed` is false while any amount is still an unreviewed "
                    + "placeholder — the client must then present the figures as a draft.")
    @GetMapping
    public FeeScheduleResponse fees(@PathVariable UUID caseId) {
        cases.get(caseId);
        return FeeScheduleResponse.from(fees.current());
    }
}
