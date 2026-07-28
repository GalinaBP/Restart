package ru.restart.app.eligibility.domain;

import java.util.ArrayList;
import java.util.List;

/**
 * Screening rules for the 2-minute eligibility check.
 *
 * <p><strong>PLACEHOLDER RULES — pending lawyer review.</strong> The criteria are a literal
 * translation of the product constitution's ICP ("who Restart is / is not for"), not a legal
 * opinion. Every complexity marker routes to a lawyer honestly rather than pretending the case is
 * simple. Reasons are plain Russian, written for the user, never legalese.
 */
public final class EligibilityRules {

    public EligibilityResult evaluate(EligibilityAnswers answers) {
        // A debt this small is not worth a court bankruptcy: Restart is not the right tool, but
        // this is honestly not a "needs a lawyer" case, so it short-circuits everything else.
        if (answers.debtRange() == DebtRange.UNDER_350K) {
            return EligibilityResult.debtTooSmall();
        }

        // The court will not start the procedure without the mandatory payments (deposit,
        // publications, postage). A lawyer would only add cost, so this stops the check honestly
        // instead of joining the lawyer reasons.
        if (answers.notReadyForCosts()) {
            return EligibilityResult.notReadyForCosts();
        }

        List<String> reasons = new ArrayList<>();

        switch (answers.debtRange()) {
            case OVER_3M -> reasons.add(
                    "Долг больше 3 миллионов — такие дела лучше вести вместе с юристом.");
            case UNDER_350K, FROM_350K_TO_3M -> { }
        }
        if (answers.hasCar()) {
            reasons.add("Машина — это имущество, которое суд будет оценивать отдельно.");
        }
        if (answers.hasExtraRealEstate()) {
            reasons.add("Недвижимость кроме единственного жилья усложняет процедуру.");
        }
        if (answers.hasBusiness()) {
            reasons.add("Свой бизнес или доля в компании требуют отдельного анализа.");
        }
        if (answers.marriedOrDivorcing()) {
            reasons.add("Брак или развод затрагивают общее имущество — тут нужен юрист.");
        }
        if (answers.soldOrGiftedAssetsRecently()) {
            reasons.add("Недавние продажи или подарки ценного имущества суд проверит отдельно.");
        }
        if (!answers.onlyConsumerDebts()) {
            reasons.add("Долги не по кредитам и займам (например, по бизнесу или алиментам) — "
                    + "это отдельная история.");
        }
        if (answers.hasForeignAssetsOrLawsuits()) {
            reasons.add("Активы за границей или судебные споры делают дело сложным.");
        }
        if (answers.movedMoneyBeforeFiling()) {
            reasons.add("Если перед банкротством со счетов уходили крупные суммы, суд разберётся "
                    + "с этим отдельно — тут надёжнее с юристом.");
        }
        if (answers.hasAlimonyDebt()) {
            reasons.add("Долги по алиментам не спишутся, и с ними нужен отдельный разбор.");
        }
        if (answers.hasLifeHealthHarmDebt()) {
            reasons.add("Долги за вред здоровью или жизни человека не списываются — "
                    + "такой случай сложнее.");
        }
        if (answers.hasEconomicCriminalCase()) {
            reasons.add("Если есть уголовное дело из-за денег или бизнеса, вести дело стоит "
                    + "только с юристом.");
        }
        if (answers.guaranteedOthersDebt()) {
            reasons.add("Если вы поручались по чужому кредиту, это добавляет сложностей — "
                    + "лучше с юристом.");
        }
        if (answers.incomeUnofficial()) {
            reasons.add("Когда доход неофициальный или его трудно подтвердить, дело ведут "
                    + "аккуратнее — здесь поможет юрист.");
        }
        if (answers.largeThirdPartyDeposits()) {
            reasons.add("Крупные поступления на счёт от других людей суд проверит отдельно.");
        }
        if (answers.manyCreditors()) {
            reasons.add("Если тех, кому вы должны, больше пяти, дело сложнее — "
                    + "надёжнее пройти его с юристом.");
        }
        if (answers.preferredPath() == PreferredPath.LAWYER) {
            reasons.add("Вы сами выбрали пройти процедуру с юристом — это разумно, "
                    + "если хочется поддержки на каждом шаге.");
        }

        return reasons.isEmpty() ? EligibilityResult.fits() : EligibilityResult.needsLawyer(reasons);
    }
}
