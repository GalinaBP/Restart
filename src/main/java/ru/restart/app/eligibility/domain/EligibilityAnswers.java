package ru.restart.app.eligibility.domain;

/**
 * The user's answers to the 2-minute eligibility check, already validated at the API boundary.
 * Mirrors the constitution's ICP screening questions one-to-one.
 *
 * <p>The last two fields are the forward-looking screening added by the consequences step: they
 * capture plans that bankruptcy would restrict, so a poor fit is caught before the person invests
 * time. PLACEHOLDER — the exact questions and their weight are pending lawyer review.
 */
public record EligibilityAnswers(
        DebtRange debtRange,
        boolean hasCar,
        boolean hasExtraRealEstate,
        boolean hasBusiness,
        boolean marriedOrDivorcing,
        boolean soldOrGiftedAssetsRecently,
        boolean onlyConsumerDebts,
        boolean hasForeignAssetsOrLawsuits,
        boolean plansToStartBusiness,
        boolean plansMajorBorrowingSoon) {
}
