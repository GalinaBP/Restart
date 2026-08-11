package ru.restart.app.eligibility.domain;

import java.util.List;

public record EligibilityAnswers(
        DebtRange debtRange,
        List<DebtType> debtTypes,
        PaymentStatus paymentStatus,
        LoanAge loanAge,
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
