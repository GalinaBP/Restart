package ru.restart.app.eligibility.domain;

import java.util.ArrayList;
import java.util.List;

/**
 * Screening rules for the 2-minute eligibility check.
 *
 * <p><strong>PLACEHOLDER RULES — pending lawyer review.</strong> They encode a product decision
 * about which cases are clean enough to carry alone, not a legal opinion. Every complexity marker
 * routes to a lawyer honestly rather than pretending the case is simple. Reasons are plain
 * Russian, written for the user, never legalese.
 *
 * <p>Four outcomes, decided in this order:
 * <ol>
 *   <li><b>NOT_RECOMMENDED</b> — bankruptcy would not give this person what they came for: the
 *       debts that weigh on them are not written off, or there is nothing here it would solve.
 *       Decided first, because telling someone to save up for costs (or to find a lawyer) when the
 *       procedure cannot help them is worse than useless.</li>
 *   <li><b>NOT_READY_FOR_COSTS</b> — the court will not start without the mandatory payments, and
 *       a lawyer would only add to the bill.</li>
 *   <li><b>NEEDS_LAWYER</b> — anything the person should not untangle alone.</li>
 *   <li><b>SELF_SERVICE_OK</b> — nothing above applies.</li>
 * </ol>
 *
 * <p>The size of the debt decides nothing on its own: it says nothing about whether a person can
 * carry the procedure themselves. Neither do bailiffs — enforcement proceedings are the everyday
 * situation of someone with problem debts, not a sign of a complicated bankruptcy.
 */
public final class EligibilityRules {

    /** Debts a person can go through this product with. Everything else needs a closer look. */
    private static final List<DebtType> CONSUMER_DEBTS =
            List.of(DebtType.CREDITS, DebtType.MICROLOANS, DebtType.INSTALMENTS);

    /** Owning this is not, by itself, a complicated case: a home is the case we are built for. */
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

    /** Cases where the procedure itself is the wrong answer — a lawyer would not change that. */
    private List<String> notRecommendedReasons(EligibilityAnswers answers) {
        List<String> reasons = new ArrayList<>();

        // Paying everything on time is not a bankruptcy case. The procedure has real consequences,
        // and someone who is coping should hear that plainly instead of being walked into it.
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

    /** Everything the person should not untangle on their own. */
    private List<String> lawyerReasons(EligibilityAnswers answers) {
        List<String> reasons = new ArrayList<>();

        // --- what the debts are made of -------------------------------------------------------
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

        // --- how the debts arose --------------------------------------------------------------
        // Not the age of the loans, but what was borrowed once repaying it was already out of
        // reach: that is what turns a simple case into one about the debtor's good faith.
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

        // --- what the person owns -------------------------------------------------------------
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

        // --- entrepreneur or company ----------------------------------------------------------
        switch (answers.businessStatus()) {
            case CURRENT_ENTREPRENEUR, RECENTLY_CLOSED_ENTREPRENEUR -> reasons.add(
                    "У предпринимателя процедура идёт по своим правилам — вести её "
                            + "самостоятельно мы не советуем.");
            case COMPANY_OWNER -> reasons.add(
                    "Компания или доля в компании требует отдельного разбора с юристом.");
            case NONE, SELF_EMPLOYED -> { }
        }

        // --- deals of the last three years ----------------------------------------------------
        // One of the strongest filters: deals of the last years can be looked at separately.
        if (answers.soldOrGiftedAssets() == YesNoUnsure.YES) {
            reasons.add("Вы продавали или дарили имущество за последние три года. Такие сделки "
                    + "суд разбирает отдельно — идите с юристом.");
        } else if (answers.soldOrGiftedAssets() == YesNoUnsure.UNSURE) {
            reasons.add("Вы не уверены, были ли за три года продажи или подарки имущества. "
                    + "Это стоит проверить с юристом до подачи.");
        }

        // --- marriage -------------------------------------------------------------------------
        if (answers.maritalStatus() != MaritalStatus.NO) {
            reasons.add("Брак — сейчас или в последние три года — затрагивает общее имущество "
                    + "и супруга. Такие дела ведут с юристом.");
        }

        // --- abroad, courts -------------------------------------------------------------------
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

        // --- money movements ------------------------------------------------------------------
        if (answers.unusualMoneyOperations() == YesNoUnsure.YES) {
            reasons.add("Крупные или необычные операции по счетам управляющий изучит подробно — "
                    + "лучше подготовиться к этому с юристом.");
        } else if (answers.unusualMoneyOperations() == YesNoUnsure.UNSURE) {
            reasons.add("Вы не уверены, были ли крупные операции по счетам. Это стоит "
                    + "проверить с юристом.");
        }

        // --- special obligations --------------------------------------------------------------
        if (answers.specialCircumstances().contains(SpecialCircumstance.ECONOMIC_CRIMINAL_CASE)) {
            reasons.add("Уголовное дело из-за денег или бизнеса — случай, где юрист обязателен.");
        }
        if (answers.specialCircumstances().contains(SpecialCircumstance.GUARANTOR)) {
            reasons.add("Поручительство по чужому кредиту добавляет сложностей — лучше с юристом.");
        }
        if (answers.specialCircumstances().contains(SpecialCircumstance.OTHER_UNUSUAL)) {
            reasons.add("Есть необычное обязательство — пусть его посмотрит юрист.");
        }

        // --- what the person asked for --------------------------------------------------------
        if (answers.preferredPath() == PreferredPath.LAWYER) {
            reasons.add("Вы сами выбрали пройти процедуру с юристом — это разумно, "
                    + "если хочется поддержки на каждом шаге.");
        }

        // Borrowing to service old debts is a risk marker, not a verdict: it is normal enough on
        // its own, and only worth saying out loud once the case is going to a lawyer anyway.
        if (!reasons.isEmpty() && answers.paymentStatus() == PaymentStatus.NEW_LOANS_FOR_OLD) {
            reasons.add("Вы берёте новые займы, чтобы платить по старым. Расскажите об этом "
                    + "юристу — это важная часть картины.");
        }
        return reasons;
    }
}
