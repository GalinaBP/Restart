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
        model.put("creditors", List.of(
                Map.of("index", "1", "name", "ПАО «Банк Восход»", "inn", "7707083893",
                        "address", "г. Москва, ул. Банковская, д. 3",
                        "debtAmount", "1 000 000,00", "debtType", "кредитный договор"),
                Map.of("index", "2", "name", "МФО «Деньги-Быстро»", "inn", "500100732259",
                        "address", "г. Тверь, пр-т Займов, д. 7",
                        "debtAmount", "250 000,00", "debtType", "договор микрозайма")));
        model.put("debts", List.of(
                Map.of("index", "1", "creditorName", "ПАО «Банк Восход»",
                        "amount", "1 000 000,00", "overdueSinceDate", "01.02.2026",
                        "type", "потребительский кредит"),
                Map.of("index", "2", "creditorName", "МФО «Деньги-Быстро»",
                        "amount", "250 000,00", "overdueSinceDate", "15.03.2026",
                        "type", "микрозаём")));
        model.put("propertyItems", List.of(
                Map.of("index", "1", "description", "Ноутбук Apple MacBook Air 13",
                        "estimatedValue", "60 000,00")));
        // The narrow ICP has neither real estate nor vehicles — templates must render the
        // "отсутствует" branches, so the reference case keeps these lists empty on purpose.
        model.put("realEstate", List.of());
        model.put("vehicles", List.of());
        model.put("bankAccounts", List.of(
                Map.of("index", "1", "bankName", "ПАО «Банк Восход»",
                        "accountNumber", "40817•••1234", "balance", "3 500,00")));
        model.put("monthlyIncome", Map.of("amount", "85 000,00", "source", "заработная плата"));
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
