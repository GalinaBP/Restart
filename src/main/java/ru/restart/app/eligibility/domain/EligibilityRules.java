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
        List<String> reasons = new ArrayList<>();

        switch (answers.debtRange()) {
            case UNDER_500K -> reasons.add(
                    "С долгом меньше 500 тысяч банкротство может быть не лучшим вариантом — "
                            + "есть способы проще.");
            case OVER_3M -> reasons.add(
                    "Долг больше 3 миллионов — такие дела лучше вести вместе с юристом.");
            case FROM_500K_TO_3M -> { }
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
        if (answers.preferredPath() == PreferredPath.LAWYER) {
            reasons.add("Вы сами выбрали пройти процедуру с юристом — это разумно, "
                    + "если хочется поддержки на каждом шаге.");
        }

        return reasons.isEmpty() ? EligibilityResult.fits() : EligibilityResult.needsLawyer(reasons);
    }
}
