package ru.restart.app.doctemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The reference model for template tests — one fully populated, ICP-realistic case (young
 * consumer debtor: creditors and accounts, no real estate, no vehicles). Every displayed value is
 * a preformatted string: the renderer is logic-less by design, formatting is the generation
 * engine's job (AI-006). This map also documents the model contract templates may rely on.
 */
public final class SampleModels {

    private SampleModels() {
    }

    public static Map<String, Object> fullCase() {
        Map<String, Object> model = new HashMap<>();
        model.put("generatedDate", "16.07.2026");
        model.put("court", Map.of("name", "Арбитражный суд города Москвы"));
        model.put("applicant", applicant());
        model.put("creditorCount", "2");
        model.put("totalDebt", "1 250 000,00");
        // One entry per debt: who is owed, how much, and since when it went unpaid — the merged
        // CREDITORS step (formerly CREDITORS + DEBTS, which asked for the same facts twice).
        model.put("creditors", List.of(
                Map.of("index", "1", "name", "ПАО «Банк Восход»", "inn", "7707083893",
                        "address", "г. Москва, ул. Банковская, д. 3",
                        "debtAmount", "1 000 000,00", "debtType", "потребительский кредит",
                        "overdueSinceDate", "01.02.2026"),
                Map.of("index", "2", "name", "МФО «Деньги-Быстро»", "inn", "500100732259",
                        "address", "г. Тверь, пр-т Займов, д. 7",
                        "debtAmount", "250 000,00", "debtType", "договор микрозайма",
                        "overdueSinceDate", "15.03.2026")));
        // The narrow ICP has neither real estate nor vehicles — templates must render the
        // "отсутствует" branches, so the reference case keeps these lists empty on purpose.
        model.put("realEstate", List.of());
        model.put("vehicles", List.of());
        model.put("bankAccounts", List.of(
                Map.of("index", "1", "bankName", "ПАО «Банк Восход»",
                        "accountNumber", "40817•••1234", "balance", "3 500,00")));
        model.put("monthlyIncome", Map.of("amount", "85 000,00", "source", "заработная плата"));
        model.put("otherIncome", List.of(
                Map.of("index", "1", "source", "сдача комнаты в аренду", "amount", "15 000,00")));
        model.put("totalIncome", "100 000,00");
        // Amounts are placeholders pending lawyer sign-off, so the reference case renders the
        // "these figures are a draft" branch of the payment instructions.
        model.put("fees", Map.of(
                "stateDuty", "300,00",
                "managerDeposit", "25 000,00",
                "total", "25 300,00",
                "unconfirmed", true));
        model.put("payments", Map.of(
                "stateDutyPaidOn", "20.07.2026",
                "stateDutyReference", "чек № 4417",
                "depositPaidOn", "—",
                "depositReference", "—"));
        model.put("sro", Map.of(
                "name", "Ассоциация «СРО арбитражных управляющих «Содействие»»",
                "address", "г. Москва, ул. Управляющая, д. 5",
                "inn", "7707083893",
                "ogrn", "1027700132195",
                "registryNumber", "0012"));
        return model;
    }

    private static Map<String, Object> applicant() {
        Map<String, Object> applicant = new HashMap<>();
        applicant.put("fullName", "Иванова Анна Сергеевна");
        applicant.put("shortName", "А. С. Иванова");
        applicant.put("birthDate", "20.05.1999");
        applicant.put("birthPlace", "г. Москва");
        applicant.put("passportSeries", "4519");
        applicant.put("passportNumber", "123456");
        applicant.put("passportIssuedBy", "ГУ МВД России по г. Москве");
        applicant.put("passportIssueDate", "14.06.2019");
        applicant.put("inn", "500100732259");
        applicant.put("snils", "112-233-445 95");
        applicant.put("address", "г. Москва, ул. Ленина, д. 1, кв. 2");
        applicant.put("phone", "+7 900 000-00-00");
        applicant.put("email", "anna@example.com");
        return applicant;
    }
}
