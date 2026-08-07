package ru.restart.app.eligibility.infrastructure;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import ru.restart.app.eligibility.domain.BusinessStatus;
import ru.restart.app.eligibility.domain.CostsReadiness;
import ru.restart.app.eligibility.domain.DealAsset;
import ru.restart.app.eligibility.domain.DebtRange;
import ru.restart.app.eligibility.domain.DebtType;
import ru.restart.app.eligibility.domain.EligibilityAnswers;
import ru.restart.app.eligibility.domain.LoanAge;
import ru.restart.app.eligibility.domain.MaritalStatus;
import ru.restart.app.eligibility.domain.MoneyOperation;
import ru.restart.app.eligibility.domain.PaymentStatus;
import ru.restart.app.eligibility.domain.PreferredPath;
import ru.restart.app.eligibility.domain.PropertyItem;
import ru.restart.app.eligibility.domain.SpecialCircumstance;
import ru.restart.app.eligibility.domain.YesNoUnsure;

import java.util.List;

/**
 * Request body of the eligibility check. Every answer is {@code @NotNull} so a missing one is a
 * validation error rather than silently defaulting; the multiple-choice questions are
 * {@code @NotEmpty} because "ничего из этого" is itself an option there.
 *
 * <p>The follow-up answers are optional on purpose — they are only asked when the parent answer
 * calls for them: {@code knewCouldNotRepay} when the loans are three months old or less,
 * {@code dealAssets} after "yes" to deals, {@code moneyOperations} after "yes" to unusual activity.
 */
public record EligibilityCheckRequest(
        @NotNull DebtRange debtRange,
        @NotEmpty List<DebtType> debtTypes,
        @NotNull PaymentStatus paymentStatus,
        @NotNull LoanAge loanAge,
        YesNoUnsure knewCouldNotRepay,
        @NotNull YesNoUnsure newLoansAfterTrouble,
        @NotEmpty List<PropertyItem> property,
        @NotNull BusinessStatus businessStatus,
        @NotNull YesNoUnsure soldOrGiftedAssets,
        List<DealAsset> dealAssets,
        @NotNull MaritalStatus maritalStatus,
        @NotNull Boolean hasForeignAssets,
        @NotNull YesNoUnsure hasLawsuits,
        @NotNull YesNoUnsure hasEnforcementProceedings,
        @NotNull YesNoUnsure unusualMoneyOperations,
        List<MoneyOperation> moneyOperations,
        @NotEmpty List<SpecialCircumstance> specialCircumstances,
        @NotNull CostsReadiness costsReadiness,
        @NotNull PreferredPath preferredPath) {

    EligibilityAnswers toAnswers() {
        return new EligibilityAnswers(debtRange, debtTypes, paymentStatus, loanAge,
                knewCouldNotRepay, newLoansAfterTrouble, property, businessStatus,
                soldOrGiftedAssets, orEmpty(dealAssets), maritalStatus, hasForeignAssets,
                hasLawsuits, hasEnforcementProceedings, unusualMoneyOperations,
                orEmpty(moneyOperations), specialCircumstances, costsReadiness, preferredPath);
    }

    private static <T> List<T> orEmpty(List<T> values) {
        return values == null ? List.of() : values;
    }
}
