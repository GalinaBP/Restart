package ru.restart.app.eligibility.application;

import org.springframework.stereotype.Service;
import ru.restart.app.eligibility.domain.EligibilityAnswers;
import ru.restart.app.eligibility.domain.EligibilityResult;
import ru.restart.app.eligibility.domain.EligibilityRules;

/**
 * Use case: evaluate the 2-minute eligibility check. Stateless in V1 — answers are not persisted
 * (the check runs before any account exists). Persistence and audit events arrive together with
 * the auth module.
 */
@Service
public class EligibilityService {

    private final EligibilityRules rules = new EligibilityRules();

    public EligibilityResult check(EligibilityAnswers answers) {
        return rules.evaluate(answers);
    }
}
