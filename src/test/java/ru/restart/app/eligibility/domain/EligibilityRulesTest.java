package ru.restart.app.eligibility.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.function.UnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;

class EligibilityRulesTest {

    private final EligibilityRules rules = new EligibilityRules();

    /**
     * Fluent builder over the (now 16-component) answers record — starts from a straightforward
     * fitting case and each call flips exactly one marker, so tests read by intent and adding a
     * future marker never touches the existing call sites.
     */
    private static final class Case {
        private DebtRange debtRange = DebtRange.FROM_500K_TO_3M;
        private boolean hasCar;
        private boolean hasExtraRealEstate;
        private boolean hasBusiness;
        private boolean marriedOrDivorcing;
        private boolean soldOrGiftedAssetsRecently;
        private boolean onlyConsumerDebts = true;
        private boolean hasForeignAssetsOrLawsuits;
        private boolean movedMoneyBeforeFiling;
        private boolean hasAlimonyDebt;
        private boolean hasLifeHealthHarmDebt;
        private boolean hasEconomicCriminalCase;
        private boolean guaranteedOthersDebt;
        private boolean incomeUnofficial;
        private boolean largeThirdPartyDeposits;
        private PreferredPath preferredPath = PreferredPath.SELF_SERVICE;

        static Case fitting() {
            return new Case();
        }

        Case debt(DebtRange range) {
            this.debtRange = range;
            return this;
        }

        Case path(PreferredPath path) {
            this.preferredPath = path;
            return this;
        }

        /** Turns on every complexity marker — the "worst case" used for reason counting. */
        Case allMarkers() {
            hasCar = true;
            hasExtraRealEstate = true;
            hasBusiness = true;
            marriedOrDivorcing = true;
            soldOrGiftedAssetsRecently = true;
            onlyConsumerDebts = false;
            hasForeignAssetsOrLawsuits = true;
            movedMoneyBeforeFiling = true;
            hasAlimonyDebt = true;
            hasLifeHealthHarmDebt = true;
            hasEconomicCriminalCase = true;
            guaranteedOthersDebt = true;
            incomeUnofficial = true;
            largeThirdPartyDeposits = true;
            return this;
        }

        EligibilityAnswers build() {
            return new EligibilityAnswers(debtRange, hasCar, hasExtraRealEstate, hasBusiness,
                    marriedOrDivorcing, soldOrGiftedAssetsRecently, onlyConsumerDebts,
                    hasForeignAssetsOrLawsuits, movedMoneyBeforeFiling, hasAlimonyDebt,
                    hasLifeHealthHarmDebt, hasEconomicCriminalCase, guaranteedOthersDebt,
                    incomeUnofficial, largeThirdPartyDeposits, preferredPath);
        }
    }

    @Test
    void typicalIcpCaseFits() {
        EligibilityResult result = rules.evaluate(Case.fitting().build());

        assertThat(result.decision()).isEqualTo(EligibilityDecision.SELF_SERVICE_OK);
        assertThat(result.reasons()).isEmpty();
    }

    @ParameterizedTest
    @EnumSource(value = DebtRange.class, names = {"UNDER_500K", "OVER_3M"})
    void debtOutsideFocusRangeNeedsLawyer(DebtRange range) {
        EligibilityResult result = rules.evaluate(Case.fitting().debt(range).build());

        assertThat(result.decision()).isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(result.reasons()).hasSize(1);
    }

    @Test
    void anySingleComplexityMarkerNeedsLawyer() {
        // Each transform flips exactly one marker on top of the fitting baseline.
        @SuppressWarnings("unchecked")
        UnaryOperator<Case>[] markers = new UnaryOperator[] {
                (UnaryOperator<Case>) c -> { c.hasCar = true; return c; },
                (UnaryOperator<Case>) c -> { c.hasExtraRealEstate = true; return c; },
                (UnaryOperator<Case>) c -> { c.hasBusiness = true; return c; },
                (UnaryOperator<Case>) c -> { c.marriedOrDivorcing = true; return c; },
                (UnaryOperator<Case>) c -> { c.soldOrGiftedAssetsRecently = true; return c; },
                (UnaryOperator<Case>) c -> { c.onlyConsumerDebts = false; return c; },
                (UnaryOperator<Case>) c -> { c.hasForeignAssetsOrLawsuits = true; return c; },
                (UnaryOperator<Case>) c -> { c.movedMoneyBeforeFiling = true; return c; },
                (UnaryOperator<Case>) c -> { c.hasAlimonyDebt = true; return c; },
                (UnaryOperator<Case>) c -> { c.hasLifeHealthHarmDebt = true; return c; },
                (UnaryOperator<Case>) c -> { c.hasEconomicCriminalCase = true; return c; },
                (UnaryOperator<Case>) c -> { c.guaranteedOthersDebt = true; return c; },
                (UnaryOperator<Case>) c -> { c.incomeUnofficial = true; return c; },
                (UnaryOperator<Case>) c -> { c.largeThirdPartyDeposits = true; return c; },
        };
        for (UnaryOperator<Case> marker : markers) {
            EligibilityResult result = rules.evaluate(marker.apply(Case.fitting()).build());
            assertThat(result.decision()).isEqualTo(EligibilityDecision.NEEDS_LAWYER);
            assertThat(result.reasons()).hasSize(1);
        }
    }

    @Test
    void everyMarkerContributesItsOwnReason() {
        EligibilityAnswers everything = Case.fitting().debt(DebtRange.OVER_3M).allMarkers().build();

        EligibilityResult result = rules.evaluate(everything);

        assertThat(result.decision()).isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        // Debt range + the fourteen complexity markers, each its own honest reason.
        assertThat(result.reasons()).hasSize(15);
    }

    @Test
    void askingForALawyerRoutesThereEvenWhenEverythingElseFits() {
        EligibilityResult result =
                rules.evaluate(Case.fitting().path(PreferredPath.LAWYER).build());

        assertThat(result.decision()).isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(result.reasons()).hasSize(1);
    }

    @Test
    void justExploringStillFitsWhenNothingElseIsComplex() {
        EligibilityResult result =
                rules.evaluate(Case.fitting().path(PreferredPath.EXPLORING).build());

        assertThat(result.decision()).isEqualTo(EligibilityDecision.SELF_SERVICE_OK);
    }

    @Test
    void reasonsAreUserFacingRussianWithoutLegalese() {
        EligibilityAnswers everything = Case.fitting().debt(DebtRange.OVER_3M).allMarkers().build();

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
