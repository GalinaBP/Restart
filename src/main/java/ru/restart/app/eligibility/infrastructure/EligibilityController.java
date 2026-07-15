package ru.restart.app.eligibility.infrastructure;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.restart.app.common.web.ApiPaths;
import ru.restart.app.eligibility.application.EligibilityService;

/**
 * The 2-minute eligibility check. Public (no account yet): the check is the first thing a visitor
 * does, before registration — see the URL rules in {@code common.security.SecurityConfig}.
 */
@RestController
@RequestMapping(ApiPaths.API_V1 + "/eligibility")
@Tag(name = "Eligibility", description = "Screening: does guided self-service fit this case?")
public class EligibilityController {

    private final EligibilityService service;

    public EligibilityController(EligibilityService service) {
        this.service = service;
    }

    @Operation(summary = "Run the eligibility check",
            description = "Evaluates the screening answers and returns the decision with "
                    + "plain-language reasons. Rules are placeholders pending lawyer review.")
    @PostMapping("/check")
    public EligibilityCheckResponse check(@Valid @RequestBody EligibilityCheckRequest request) {
        return EligibilityCheckResponse.from(service.check(request.toAnswers()));
    }
}
