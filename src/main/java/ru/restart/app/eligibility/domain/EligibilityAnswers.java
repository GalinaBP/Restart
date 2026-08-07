package ru.restart.app.eligibility.domain;

import java.util.List;

/**
 * The user's answers to the 2-minute eligibility check, already validated at the API boundary.
 *
 * <p>The questions, in the order they are asked: how much is owed, what the debts are made of,
 * whether the person can pay, when the debts arose and whether more was borrowed after the trouble
 * started, what they own, entrepreneur status, deals of the last three years, marriage, assets
 * abroad, court cases, bailiffs, unusual money movements, special obligations, readiness for the
 * mandatory costs, and finally how they want to proceed.
 *
 * <p>Three questions have follow-ups that are only asked when the parent answer calls for them:
 * {@code knewCouldNotRepay} (only when the loans are three months old or less), {@code dealAssets}
 * (only after "yes" to deals) and {@code moneyOperations} (only after "yes" to unusual activity).
 * The lists are empty, and {@code knewCouldNotRepay} is {@code null}, when the follow-up was never
 * shown.
 *
 * <p>PLACEHOLDER — the questions and the weight each carries are pending lawyer review.
 */
public record EligibilityAnswers(
        DebtRange debtRange,
        List<DebtType> debtTypes,
        PaymentStatus paymentStatus,
        LoanAge loanAge,
        /** Only asked when {@code loanAge} is {@code LAST_3_MONTHS}; {@code null} otherwise. */
        YesNoUnsure knewCouldNotRepay,
        YesNoUnsure newLoansAfterTrouble,
        List<PropertyItem> property,
        BusinessStatus businessStatus,
        YesNoUnsure soldOrGiftedAssets,
        List<DealAsset> dealAssets,
        MaritalStatus maritalStatus,
        boolean hasForeignAssets,
        YesNoUnsure hasLawsuits,
        YesNoUnsure hasEnforcementProceedings,
        YesNoUnsure unusualMoneyOperations,
        List<MoneyOperation> moneyOperations,
        List<SpecialCircumstance> specialCircumstances,
        CostsReadiness costsReadiness,
        PreferredPath preferredPath) {

    public EligibilityAnswers {
        debtTypes = List.copyOf(debtTypes);
        property = List.copyOf(property);
        dealAssets = List.copyOf(dealAssets);
        moneyOperations = List.copyOf(moneyOperations);
        specialCircumstances = List.copyOf(specialCircumstances);
    }
}
