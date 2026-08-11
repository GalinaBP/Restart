package ru.restart.app.eligibility.domain;

import java.util.ArrayList;
import java.util.List;

public final class EligibilityRules {

    private static final List<DebtType> CONSUMER_DEBTS =
            List.of(DebtType.CREDITS, DebtType.MICROLOANS, DebtType.INSTALMENTS);

    private static final List<PropertyItem> SIMPLE_PROPERTY =
            List.of(PropertyItem.NOTHING, PropertyItem.HOME);

    public EligibilityResult evaluate(EligibilityAnswers answers) {
        List<String> notRecommended = notRecommendedReasons(answers);
        if (!notRecommended.isEmpty()) {
            return EligibilityResult.notRecommended(notRecommended);
        }

        if (answers.costsReadiness() != CostsReadiness.READY) {
            return EligibilityResult.notReadyForCosts();
        }

        List<String> reasons = lawyerReasons(answers);
        return reasons.isEmpty() ? EligibilityResult.fits() : EligibilityResult.needsLawyer(reasons);
    }

    private List<String> notRecommendedReasons(EligibilityAnswers answers) {
        List<String> reasons = new ArrayList<>();

        if (answers.paymentStatus() == PaymentStatus.ON_TIME) {
            reasons.add("Сейчас вы платите по долгам вовремя. Банкротство — тяжёлый шаг с "
                    + "последствиями, и пока платежи вам по силам, оно вам не нужно.");
        }
        if (answers.debtTypes().contains(DebtType.ALIMONY)
                || answers.specialCircumstances().contains(SpecialCircumstance.ALIMONY_DEBT)) {
            reasons.add("Долги по алиментам не спишутся — они останутся с вами и после процедуры.");
        }
        if (answers.debtTypes().contains(DebtType.LIFE_HEALTH_HARM)
                || answers.specialCircumstances()
                        .contains(SpecialCircumstance.LIFE_HEALTH_HARM_DEBT)) {
            reasons.add("Долги за вред жизни или здоровью человека не спишутся — "
                    + "они останутся с вами и после процедуры.");
        }
        return reasons;
    }

    private List<String> lawyerReasons(EligibilityAnswers answers) {
        List<String> reasons = new ArrayList<>();

        List<DebtType> unusualDebts = answers.debtTypes().stream()
                .filter(type -> !CONSUMER_DEBTS.contains(type))
                .toList();
        if (unusualDebts.contains(DebtType.TAXES)) {
            reasons.add("Долги по налогам разбирают иначе, чем кредиты, — здесь нужен юрист.");
        }
        if (unusualDebts.contains(DebtType.PRIVATE_PERSONS)) {
            reasons.add("Долги перед людьми — не перед банком — суд проверяет отдельно.");
        }
        if (unusualDebts.contains(DebtType.OTHER) || unusualDebts.contains(DebtType.UNKNOWN)) {
            reasons.add("Есть долги, которые не похожи на обычные кредиты. Пусть в них "
                    + "разберётся юрист — так надёжнее.");
        }

        if (answers.knewCouldNotRepay() == YesNoUnsure.YES) {
            reasons.add("Вы брали деньги, уже понимая, что вернуть их не получится. В таких "
                    + "случаях суд смотрит на обстоятельства особенно внимательно — идите с юристом.");
        } else if (answers.knewCouldNotRepay() == YesNoUnsure.UNSURE) {
            reasons.add("Вы не уверены, могли ли вы вернуть последние займы, когда их брали. "
                    + "Это как раз тот вопрос, который стоит разобрать с юристом.");
        }
        if (answers.newLoansAfterTrouble() == YesNoUnsure.YES) {
            reasons.add("После того как начались проблемы с платежами, вы брали новые займы. "
                    + "Суд разбирает такие случаи подробно — надёжнее с юристом.");
        } else if (answers.newLoansAfterTrouble() == YesNoUnsure.UNSURE) {
            reasons.add("Вы не помните, брали ли новые займы после того, как начались проблемы. "
                    + "Пусть это проверит юрист.");
        }

        List<PropertyItem> hardProperty = answers.property().stream()
                .filter(item -> !SIMPLE_PROPERTY.contains(item))
                .toList();
        if (hardProperty.contains(PropertyItem.VEHICLE)) {
            reasons.add("Машина или мотоцикл — имущество, которое суд оценивает отдельно.");
        }
        if (hardProperty.contains(PropertyItem.LAND)) {
            reasons.add("Земельный участок усложняет процедуру — здесь нужен юрист.");
        }
        if (hardProperty.contains(PropertyItem.PROPERTY_SHARE)) {
            reasons.add("Доля в недвижимости — отдельный разговор: там есть и другие собственники.");
        }
        if (hardProperty.contains(PropertyItem.OTHER)
                || hardProperty.contains(PropertyItem.UNKNOWN)) {
            reasons.add("Есть имущество, о котором лучше поговорить с юристом до подачи.");
        }

        switch (answers.businessStatus()) {
            case CURRENT_ENTREPRENEUR, RECENTLY_CLOSED_ENTREPRENEUR -> reasons.add(
                    "У предпринимателя процедура идёт по своим правилам — вести её "
                            + "самостоятельно мы не советуем.");
            case COMPANY_OWNER -> reasons.add(
                    "Компания или доля в компании требует отдельного разбора с юристом.");
            case NONE, SELF_EMPLOYED -> { }
        }

        if (answers.soldOrGiftedAssets() == YesNoUnsure.YES) {
            reasons.add("Вы продавали или дарили имущество за последние три года. Такие сделки "
                    + "суд разбирает отдельно — идите с юристом.");
        } else if (answers.soldOrGiftedAssets() == YesNoUnsure.UNSURE) {
            reasons.add("Вы не уверены, были ли за три года продажи или подарки имущества. "
                    + "Это стоит проверить с юристом до подачи.");
        }

        if (answers.maritalStatus() != MaritalStatus.NO) {
            reasons.add("Брак — сейчас или в последние три года — затрагивает общее имущество "
                    + "и супруга. Такие дела ведут с юристом.");
        }

        if (answers.hasForeignAssets()) {
            reasons.add("Имущество или счета за границей делают дело сложным.");
        }
        if (answers.hasLawsuits() == YesNoUnsure.YES) {
            reasons.add("Если по вашим долгам или имуществу уже идёт суд, вести дело "
                    + "самостоятельно рискованно.");
        } else if (answers.hasLawsuits() == YesNoUnsure.UNSURE) {
            reasons.add("Вы не знаете, идут ли сейчас суды по вашим долгам. Пусть это "
                    + "проверит юрист — от этого зависит порядок действий.");
        }

        if (answers.unusualMoneyOperations() == YesNoUnsure.YES) {
            reasons.add("Крупные или необычные операции по счетам управляющий изучит подробно — "
                    + "лучше подготовиться к этому с юристом.");
        } else if (answers.unusualMoneyOperations() == YesNoUnsure.UNSURE) {
            reasons.add("Вы не уверены, были ли крупные операции по счетам. Это стоит "
                    + "проверить с юристом.");
        }

        if (answers.specialCircumstances().contains(SpecialCircumstance.ECONOMIC_CRIMINAL_CASE)) {
            reasons.add("Уголовное дело из-за денег или бизнеса — случай, где юрист обязателен.");
        }
        if (answers.specialCircumstances().contains(SpecialCircumstance.GUARANTOR)) {
            reasons.add("Поручительство по чужому кредиту добавляет сложностей — лучше с юристом.");
        }
        if (answers.specialCircumstances().contains(SpecialCircumstance.OTHER_UNUSUAL)) {
            reasons.add("Есть необычное обязательство — пусть его посмотрит юрист.");
        }

        if (answers.preferredPath() == PreferredPath.LAWYER) {
            reasons.add("Вы сами выбрали пройти процедуру с юристом — это разумно, "
                    + "если хочется поддержки на каждом шаге.");
        }

        if (!reasons.isEmpty() && answers.paymentStatus() == PaymentStatus.NEW_LOANS_FOR_OLD) {
            reasons.add("Вы берёте новые займы, чтобы платить по старым. Расскажите об этом "
                    + "юристу — это важная часть картины.");
        }
        return reasons;
    }
}
