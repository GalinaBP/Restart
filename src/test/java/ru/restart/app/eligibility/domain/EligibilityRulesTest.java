package ru.restart.app.eligibility.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

class EligibilityRulesTest {

    private final EligibilityRules rules = new EligibilityRules();

    private static EligibilityAnswers fittingAnswers() {
        return new EligibilityAnswers(DebtRange.FROM_500K_TO_3M,
                false, false, false, false, false, true, false);
    }

    @Test
    void typicalIcpCaseFits() {
        EligibilityResult result = rules.evaluate(fittingAnswers());

        assertThat(result.decision()).isEqualTo(EligibilityDecision.SELF_SERVICE_OK);
        assertThat(result.reasons()).isEmpty();
    }

    @ParameterizedTest
    @EnumSource(value = DebtRange.class, names = {"UNDER_500K", "OVER_3M"})
    void debtOutsideFocusRangeNeedsLawyer(DebtRange range) {
        EligibilityAnswers answers = new EligibilityAnswers(range,
                false, false, false, false, false, true, false);

        EligibilityResult result = rules.evaluate(answers);

        assertThat(result.decision()).isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(result.reasons()).hasSize(1);
    }

    @Test
    void anySingleComplexityMarkerNeedsLawyer() {
        EligibilityAnswers car = new EligibilityAnswers(DebtRange.FROM_500K_TO_3M,
                true, false, false, false, false, true, false);
        EligibilityAnswers realEstate = new EligibilityAnswers(DebtRange.FROM_500K_TO_3M,
                false, true, false, false, false, true, false);
        EligibilityAnswers business = new EligibilityAnswers(DebtRange.FROM_500K_TO_3M,
                false, false, true, false, false, true, false);
        EligibilityAnswers marriage = new EligibilityAnswers(DebtRange.FROM_500K_TO_3M,
                false, false, false, true, false, true, false);
        EligibilityAnswers recentDeals = new EligibilityAnswers(DebtRange.FROM_500K_TO_3M,
                false, false, false, false, true, true, false);
        EligibilityAnswers nonConsumerDebts = new EligibilityAnswers(DebtRange.FROM_500K_TO_3M,
                false, false, false, false, false, false, false);
        EligibilityAnswers foreign = new EligibilityAnswers(DebtRange.FROM_500K_TO_3M,
                false, false, false, false, false, true, true);

        for (EligibilityAnswers answers : new EligibilityAnswers[] {
                car, realEstate, business, marriage, recentDeals, nonConsumerDebts, foreign}) {
            EligibilityResult result = rules.evaluate(answers);
            assertThat(result.decision()).isEqualTo(EligibilityDecision.NEEDS_LAWYER);
            assertThat(result.reasons()).hasSize(1);
        }
    }

    @Test
    void everyMarkerContributesItsOwnReason() {
        EligibilityAnswers everything = new EligibilityAnswers(DebtRange.OVER_3M,
                true, true, true, true, true, false, true);

        EligibilityResult result = rules.evaluate(everything);

        assertThat(result.decision()).isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(result.reasons()).hasSize(8);
    }

    @Test
    void reasonsAreUserFacingRussianWithoutLegalese() {
        EligibilityAnswers everything = new EligibilityAnswers(DebtRange.OVER_3M,
                true, true, true, true, true, false, true);

        EligibilityResult result = rules.evaluate(everything);

        // Guard the constitution's non-negotiable: no statute references in user-facing text.
        // "ст." must only be flagged when followed by an article number, or every word ending
        // in -ст ("юрист.") would false-positive.
        assertThat(result.reasons()).allSatisfy(reason -> {
            assertThat(reason).doesNotContainIgnoringCase("ФЗ");
            assertThat(reason).doesNotContainPattern("ст\\.\\s*\\d");
        });
    }
}
