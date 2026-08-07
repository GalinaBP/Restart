package ru.restart.app.eligibility.domain;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class EligibilityRulesTest {

    private final EligibilityRules rules = new EligibilityRules();

    /**
     * Fluent builder over the wide answers record — starts from a straightforward fitting case
     * and each call changes exactly one answer, so tests read by intent and a future question
     * never touches the existing call sites.
     */
    private static final class Case {
        private DebtRange debtRange = DebtRange.FROM_500K_TO_1M;
        private List<DebtType> debtTypes = List.of(DebtType.CREDITS);
        private PaymentStatus paymentStatus = PaymentStatus.CANNOT_PAY_MOST;
        private LoanAge loanAge = LoanAge.OVER_YEAR_AGO;
        private YesNoUnsure knewCouldNotRepay;
        private YesNoUnsure newLoansAfterTrouble = YesNoUnsure.NO;
        private List<PropertyItem> property = List.of(PropertyItem.NOTHING);
        private BusinessStatus businessStatus = BusinessStatus.NONE;
        private YesNoUnsure soldOrGiftedAssets = YesNoUnsure.NO;
        private List<DealAsset> dealAssets = List.of();
        private MaritalStatus maritalStatus = MaritalStatus.NO;
        private boolean hasForeignAssets;
        private YesNoUnsure hasLawsuits = YesNoUnsure.NO;
        private YesNoUnsure hasEnforcementProceedings = YesNoUnsure.NO;
        private YesNoUnsure unusualMoneyOperations = YesNoUnsure.NO;
        private List<MoneyOperation> moneyOperations = List.of();
        private List<SpecialCircumstance> specialCircumstances = List.of(SpecialCircumstance.NONE);
        private CostsReadiness costsReadiness = CostsReadiness.READY;
        private PreferredPath preferredPath = PreferredPath.SELF_SERVICE;

        static Case fitting() {
            return new Case();
        }

        Case debt(DebtRange range) {
            this.debtRange = range;
            return this;
        }

        Case debts(DebtType... types) {
            this.debtTypes = List.of(types);
            return this;
        }

        Case payments(PaymentStatus status) {
            this.paymentStatus = status;
            return this;
        }

        Case loans(LoanAge age, YesNoUnsure knew) {
            this.loanAge = age;
            this.knewCouldNotRepay = knew;
            return this;
        }

        Case borrowedAfterTrouble(YesNoUnsure answer) {
            this.newLoansAfterTrouble = answer;
            return this;
        }

        Case owns(PropertyItem... items) {
            this.property = List.of(items);
            return this;
        }

        Case business(BusinessStatus status) {
            this.businessStatus = status;
            return this;
        }

        Case deals(YesNoUnsure answer, DealAsset... assets) {
            this.soldOrGiftedAssets = answer;
            this.dealAssets = List.of(assets);
            return this;
        }

        Case marriage(MaritalStatus status) {
            this.maritalStatus = status;
            return this;
        }

        Case abroad() {
            this.hasForeignAssets = true;
            return this;
        }

        Case lawsuits(YesNoUnsure answer) {
            this.hasLawsuits = answer;
            return this;
        }

        Case bailiffs(YesNoUnsure answer) {
            this.hasEnforcementProceedings = answer;
            return this;
        }

        Case operations(YesNoUnsure answer, MoneyOperation... what) {
            this.unusualMoneyOperations = answer;
            this.moneyOperations = List.of(what);
            return this;
        }

        Case special(SpecialCircumstance... circumstances) {
            this.specialCircumstances = List.of(circumstances);
            return this;
        }

        Case costs(CostsReadiness readiness) {
            this.costsReadiness = readiness;
            return this;
        }

        Case path(PreferredPath path) {
            this.preferredPath = path;
            return this;
        }

        EligibilityAnswers build() {
            return new EligibilityAnswers(debtRange, debtTypes, paymentStatus, loanAge,
                    knewCouldNotRepay, newLoansAfterTrouble, property, businessStatus,
                    soldOrGiftedAssets, dealAssets, maritalStatus, hasForeignAssets, hasLawsuits,
                    hasEnforcementProceedings, unusualMoneyOperations, moneyOperations,
                    specialCircumstances, costsReadiness, preferredPath);
        }
    }

    private EligibilityResult evaluate(Case answers) {
        return rules.evaluate(answers.build());
    }

    @Test
    void plainConsumerCaseFits() {
        EligibilityResult result = evaluate(Case.fitting());

        assertThat(result.decision()).isEqualTo(EligibilityDecision.SELF_SERVICE_OK);
        assertThat(result.reasons()).isEmpty();
    }

    @Test
    void debtSizeNeverDecidesOnItsOwn() {
        for (DebtRange range : DebtRange.values()) {
            assertThat(evaluate(Case.fitting().debt(range)).decision())
                    .as("debt range %s", range)
                    .isEqualTo(EligibilityDecision.SELF_SERVICE_OK);
        }
    }

    @Test
    void bailiffsAreEverydayForProblemDebtsAndDecideNothing() {
        for (YesNoUnsure answer : YesNoUnsure.values()) {
            assertThat(evaluate(Case.fitting().bailiffs(answer)).decision())
                    .as("bailiffs %s", answer)
                    .isEqualTo(EligibilityDecision.SELF_SERVICE_OK);
        }
    }

    @Test
    void payingOnTimeIsNotABankruptcyCase() {
        EligibilityResult result = evaluate(Case.fitting().payments(PaymentStatus.ON_TIME));

        assertThat(result.decision()).isEqualTo(EligibilityDecision.NOT_RECOMMENDED);
        assertThat(result.reasons()).anyMatch(reason -> reason.contains("платите по долгам вовремя"));
    }

    @Test
    void debtsThatSurviveBankruptcyAreNotRecommended() {
        assertThat(evaluate(Case.fitting().debts(DebtType.CREDITS, DebtType.ALIMONY)).decision())
                .isEqualTo(EligibilityDecision.NOT_RECOMMENDED);
        assertThat(evaluate(Case.fitting()
                .special(SpecialCircumstance.LIFE_HEALTH_HARM_DEBT)).decision())
                .isEqualTo(EligibilityDecision.NOT_RECOMMENDED);
    }

    @Test
    void notRecommendedWinsOverEverythingElse() {
        // A case that is unaffordable AND complicated AND pointless is told the useful thing:
        // the procedure will not write these debts off, so saving up or lawyering up changes nothing.
        EligibilityResult result = evaluate(Case.fitting()
                .debts(DebtType.CREDITS, DebtType.ALIMONY)
                .owns(PropertyItem.VEHICLE)
                .costs(CostsReadiness.NO_MONEY));

        assertThat(result.decision()).isEqualTo(EligibilityDecision.NOT_RECOMMENDED);
    }

    @Test
    void costsComeBeforeTheLawyerReferral() {
        for (CostsReadiness readiness : List.of(CostsReadiness.UNSURE, CostsReadiness.NO_MONEY)) {
            EligibilityResult result = evaluate(Case.fitting()
                    .costs(readiness)
                    .owns(PropertyItem.VEHICLE));

            assertThat(result.decision())
                    .as("costs %s", readiness)
                    .isEqualTo(EligibilityDecision.NOT_READY_FOR_COSTS);
            assertThat(result.reasons()).isEmpty();
        }
    }

    @Test
    void borrowingWhileKnowingItCouldNotBeRepaidNeedsALawyer() {
        EligibilityResult result = evaluate(Case.fitting()
                .loans(LoanAge.LAST_3_MONTHS, YesNoUnsure.YES));

        assertThat(result.decision()).isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(result.reasons()).anyMatch(reason -> reason.contains("вернуть их не получится"));
    }

    @Test
    void freshLoansAloneAreNotAProblem() {
        // The age of the loans decides nothing — only the answer about good faith does.
        assertThat(evaluate(Case.fitting().loans(LoanAge.LAST_3_MONTHS, YesNoUnsure.NO)).decision())
                .isEqualTo(EligibilityDecision.SELF_SERVICE_OK);
        assertThat(evaluate(Case.fitting().loans(LoanAge.DONT_REMEMBER, null)).decision())
                .isEqualTo(EligibilityDecision.SELF_SERVICE_OK);
    }

    @Test
    void borrowingAfterTheTroubleStartedNeedsALawyer() {
        assertThat(evaluate(Case.fitting().borrowedAfterTrouble(YesNoUnsure.YES)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(evaluate(Case.fitting().borrowedAfterTrouble(YesNoUnsure.UNSURE)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
    }

    @Test
    void aHomeIsTheSimpleCaseButAnythingElseIsNot() {
        assertThat(evaluate(Case.fitting().owns(PropertyItem.HOME)).decision())
                .isEqualTo(EligibilityDecision.SELF_SERVICE_OK);

        for (PropertyItem item : List.of(PropertyItem.VEHICLE, PropertyItem.LAND,
                PropertyItem.PROPERTY_SHARE, PropertyItem.OTHER, PropertyItem.UNKNOWN)) {
            assertThat(evaluate(Case.fitting().owns(PropertyItem.HOME, item)).decision())
                    .as("property %s", item)
                    .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        }
    }

    @Test
    void entrepreneursAndCompanyOwnersGoToALawyer() {
        assertThat(evaluate(Case.fitting().business(BusinessStatus.SELF_EMPLOYED)).decision())
                .isEqualTo(EligibilityDecision.SELF_SERVICE_OK);

        for (BusinessStatus status : List.of(BusinessStatus.CURRENT_ENTREPRENEUR,
                BusinessStatus.RECENTLY_CLOSED_ENTREPRENEUR, BusinessStatus.COMPANY_OWNER)) {
            assertThat(evaluate(Case.fitting().business(status)).decision())
                    .as("business %s", status)
                    .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        }
    }

    @Test
    void dealsOfTheLastThreeYearsGoToALawyer() {
        assertThat(evaluate(Case.fitting().deals(YesNoUnsure.YES, DealAsset.VEHICLE)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(evaluate(Case.fitting().deals(YesNoUnsure.UNSURE)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
    }

    @Test
    void marriageNowOrRecentlyGoesToALawyer() {
        for (MaritalStatus status : List.of(MaritalStatus.MARRIED,
                MaritalStatus.DIVORCED_WITHIN_3_YEARS)) {
            assertThat(evaluate(Case.fitting().marriage(status)).decision())
                    .as("marriage %s", status)
                    .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        }
    }

    @Test
    void notKnowingIsItselfAReasonToAsk() {
        assertThat(evaluate(Case.fitting().lawsuits(YesNoUnsure.UNSURE)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(evaluate(Case.fitting().operations(YesNoUnsure.UNSURE)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
    }

    @Test
    void foreignAssetsLawsuitsAndMoneyMovementsGoToALawyer() {
        assertThat(evaluate(Case.fitting().abroad()).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(evaluate(Case.fitting().lawsuits(YesNoUnsure.YES)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(evaluate(Case.fitting()
                .operations(YesNoUnsure.YES, MoneyOperation.LARGE_CASH_WITHDRAWALS)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
    }

    @Test
    void unusualDebtsAndObligationsGoToALawyer() {
        assertThat(evaluate(Case.fitting().debts(DebtType.CREDITS, DebtType.TAXES)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(evaluate(Case.fitting().debts(DebtType.PRIVATE_PERSONS)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(evaluate(Case.fitting().debts(DebtType.UNKNOWN)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(evaluate(Case.fitting().special(SpecialCircumstance.GUARANTOR)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(evaluate(Case.fitting()
                .special(SpecialCircumstance.ECONOMIC_CRIMINAL_CASE)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(evaluate(Case.fitting().special(SpecialCircumstance.OTHER_UNUSUAL)).decision())
                .isEqualTo(EligibilityDecision.NEEDS_LAWYER);
    }

    @Test
    void askingForALawyerIsHonoured() {
        EligibilityResult result = evaluate(Case.fitting().path(PreferredPath.LAWYER));

        assertThat(result.decision()).isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(result.reasons()).hasSize(1);
    }

    @Test
    void justExploringStillFits() {
        assertThat(evaluate(Case.fitting().path(PreferredPath.EXPLORING)).decision())
                .isEqualTo(EligibilityDecision.SELF_SERVICE_OK);
    }

    @Test
    void borrowingToServiceOldDebtsIsSaidOutLoudOnlyAlongsideARealReason() {
        // On its own it is not a verdict: plenty of people juggle payments that way.
        assertThat(evaluate(Case.fitting().payments(PaymentStatus.NEW_LOANS_FOR_OLD)).decision())
                .isEqualTo(EligibilityDecision.SELF_SERVICE_OK);

        // Once the case is going to a lawyer anyway, it belongs in the picture they are given.
        EligibilityResult result = evaluate(Case.fitting()
                .payments(PaymentStatus.NEW_LOANS_FOR_OLD)
                .abroad());

        assertThat(result.decision()).isEqualTo(EligibilityDecision.NEEDS_LAWYER);
        assertThat(result.reasons()).anyMatch(reason -> reason.contains("новые займы, чтобы платить"));
    }

    @Test
    void reasonsAreWrittenForTheUserNotForLawyers() {
        EligibilityResult result = evaluate(Case.fitting()
                .owns(PropertyItem.VEHICLE, PropertyItem.LAND)
                .business(BusinessStatus.COMPANY_OWNER)
                .marriage(MaritalStatus.MARRIED)
                .abroad());

        assertThat(result.reasons()).hasSize(5);
        // No statute citations: «ст. 213.4», «п. 2», «127-ФЗ», «Пленум» — that language is for the
        // lawyer review, never for the person reading the verdict.
        assertThat(result.reasons()).allSatisfy(reason -> assertThat(reason)
                .doesNotContain("127-ФЗ")
                .doesNotContain("Пленум")
                .doesNotContainPattern("\\b[сп]\\.\\s*\\d"));
    }
}
