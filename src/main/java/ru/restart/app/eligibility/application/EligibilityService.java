package ru.restart.app.eligibility.application;

import org.springframework.stereotype.Service;
import ru.restart.app.eligibility.domain.EligibilityAnswers;
import ru.restart.app.eligibility.domain.EligibilityResult;
import ru.restart.app.eligibility.domain.EligibilityRules;

@Service
public class EligibilityService {

    private final EligibilityRules rules = new EligibilityRules();

    public EligibilityResult check(EligibilityAnswers answers) {
        return rules.evaluate(answers);
    }
}
