package ru.restart.app.eligibility.domain;

/**
 * The user's answers to the 2-minute eligibility check, already validated at the API boundary.
 * Mirrors the constitution's ICP screening questions one-to-one.
 *
 * <p>{@code preferredPath} is the closing question — how the person wants to proceed. Asking for a
 * lawyer routes there directly. PLACEHOLDER — the questions and their weight are pending lawyer
 * review.
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
        PreferredPath preferredPath) {
}
