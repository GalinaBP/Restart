package ru.restart.app.eligibility.domain;

/**
 * The user's answers to the 2-minute eligibility check, already validated at the API boundary.
 * Mirrors the constitution's ICP screening questions one-to-one.
 *
 * <p>The block from {@code movedMoneyBeforeFiling} to {@code largeThirdPartyDeposits} are the
 * "clean case" markers: each is {@code true} when the corresponding complication is present, so a
 * simple self-service case has them all {@code false}.
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
        boolean movedMoneyBeforeFiling,
        boolean hasAlimonyDebt,
        boolean hasLifeHealthHarmDebt,
        boolean hasEconomicCriminalCase,
        boolean guaranteedOthersDebt,
        boolean incomeUnofficial,
        boolean largeThirdPartyDeposits,
        PreferredPath preferredPath) {
}
