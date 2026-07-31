package ru.restart.app.eligibility.infrastructure;

import jakarta.validation.constraints.NotNull;
import ru.restart.app.eligibility.domain.DebtRange;
import ru.restart.app.eligibility.domain.EligibilityAnswers;
import ru.restart.app.eligibility.domain.PreferredPath;

/**
 * Request body of the eligibility check. Booleans are boxed and {@code @NotNull} so a missing
 * answer is a validation error rather than silently defaulting to {@code false}.
 */
public record EligibilityCheckRequest(
        @NotNull DebtRange debtRange,
        @NotNull Boolean hasCar,
        @NotNull Boolean hasExtraRealEstate,
        @NotNull Boolean hasBusiness,
        @NotNull Boolean marriedOrDivorcing,
        @NotNull Boolean soldOrGiftedAssetsRecently,
        @NotNull Boolean onlyConsumerDebts,
        @NotNull Boolean hasForeignAssets,
        @NotNull Boolean hasLawsuits,
        @NotNull Boolean hasEnforcementProceedings,
        @NotNull Boolean movedMoneyBeforeFiling,
        @NotNull Boolean hasAlimonyDebt,
        @NotNull Boolean hasLifeHealthHarmDebt,
        @NotNull Boolean hasEconomicCriminalCase,
        @NotNull Boolean guaranteedOthersDebt,
        @NotNull Boolean incomeUnofficial,
        @NotNull Boolean largeThirdPartyDeposits,
        @NotNull Boolean manyCreditors,
        @NotNull Boolean notReadyForCosts,
        @NotNull PreferredPath preferredPath) {

    EligibilityAnswers toAnswers() {
        return new EligibilityAnswers(debtRange, hasCar, hasExtraRealEstate, hasBusiness,
                marriedOrDivorcing, soldOrGiftedAssetsRecently, onlyConsumerDebts,
                hasForeignAssets, hasLawsuits, hasEnforcementProceedings, movedMoneyBeforeFiling,
                hasAlimonyDebt, hasLifeHealthHarmDebt, hasEconomicCriminalCase,
                guaranteedOthersDebt, incomeUnofficial, largeThirdPartyDeposits, manyCreditors,
                notReadyForCosts, preferredPath);
    }
}
