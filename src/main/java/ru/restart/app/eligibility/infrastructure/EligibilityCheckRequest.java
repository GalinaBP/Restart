package ru.restart.app.eligibility.infrastructure;

import jakarta.validation.constraints.NotNull;
import ru.restart.app.eligibility.domain.DebtRange;
import ru.restart.app.eligibility.domain.EligibilityAnswers;

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
        @NotNull Boolean hasForeignAssetsOrLawsuits,
        @NotNull Boolean plansToStartBusiness,
        @NotNull Boolean plansMajorBorrowingSoon) {

    EligibilityAnswers toAnswers() {
        return new EligibilityAnswers(debtRange, hasCar, hasExtraRealEstate, hasBusiness,
                marriedOrDivorcing, soldOrGiftedAssetsRecently, onlyConsumerDebts,
                hasForeignAssetsOrLawsuits, plansToStartBusiness, plansMajorBorrowingSoon);
    }
}
