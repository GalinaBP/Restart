package ru.restart.app.casefile.application;

import org.springframework.stereotype.Component;
import ru.restart.app.casefile.domain.CaseSection;
import ru.restart.app.casefile.domain.CourtDirectory;
import ru.restart.app.casefile.domain.SectionKey;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Maps collected (and already validated) case data into the template model contract of the
 * {@code doctemplate} module: every displayed value preformatted as a string, every key present.
 * Formatting decisions live here, not in templates — the renderer is logic-less by design.
 *
 * <p>Runs only behind the validation gate, so required fields exist and values parse; optional
 * blanks become "—" so a court document never shows an empty gap.
 */
@Component
public class CaseModelAssembler {

    /** Shown when the registration region cannot be matched to a court — honest, never a guess. */
    static final String COURT_PLACEHOLDER =
            "Арбитражный суд по месту регистрации должника — [УТОЧНЯЕТСЯ]";
    private static final String ABSENT = "—";
    private static final DateTimeFormatter RU_DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final CourtDirectory courts;

    public CaseModelAssembler(ObjectMapper objectMapper, Clock clock, CourtDirectory courts) {
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.courts = courts;
    }

    public Map<String, Object> assemble(List<CaseSection> sections) {
        Map<SectionKey, JsonNode> data = new HashMap<>();
        for (CaseSection section : sections) {
            data.put(section.key(), objectMapper.readTree(section.payloadJson()));
        }

        Map<String, Object> model = new HashMap<>();
        model.put("generatedDate", LocalDate.now(clock).format(RU_DATE));
        JsonNode registration = data.get(SectionKey.REGISTRATION_ADDRESS);
        String regionText = (text(registration, "region") + " " + text(registration, "city")).trim();
        model.put("court", Map.of("name", courts.courtFor(regionText).orElse(COURT_PLACEHOLDER)));
        model.put("applicant", applicant(data));
        creditors(data.get(SectionKey.CREDITORS), model);
        model.put("debts", debts(data.get(SectionKey.DEBTS)));
        model.put("propertyItems", propertyItems(data.get(SectionKey.PROPERTY)));
        model.put("realEstate", realEstate(data.get(SectionKey.REAL_ESTATE)));
        model.put("vehicles", vehicles(data.get(SectionKey.VEHICLES)));
        model.put("bankAccounts", bankAccounts(data.get(SectionKey.BANK_ACCOUNTS)));
        model.put("monthlyIncome", monthlyIncome(data.get(SectionKey.MONTHLY_INCOME)));
        return model;
    }

    private Map<String, Object> applicant(Map<SectionKey, JsonNode> data) {
        JsonNode personal = data.get(SectionKey.PERSONAL_DETAILS);
        JsonNode passport = data.get(SectionKey.PASSPORT);
        JsonNode address = data.get(SectionKey.REGISTRATION_ADDRESS);
        JsonNode contact = data.get(SectionKey.CONTACT_INFO);

        String lastName = text(personal, "lastName");
        String firstName = text(personal, "firstName");
        String middleName = text(personal, "middleName");

        Map<String, Object> applicant = new HashMap<>();
        applicant.put("fullName", joinNonBlank(" ", lastName, firstName, middleName));
        applicant.put("shortName", shortName(lastName, firstName, middleName));
        applicant.put("birthDate", ruDate(text(personal, "birthDate")));
        applicant.put("birthPlace", text(personal, "birthPlace"));
        applicant.put("inn", orAbsent(text(personal, "inn")));
        applicant.put("snils", orAbsent(text(personal, "snils")));
        applicant.put("passportSeries", text(passport, "series"));
        applicant.put("passportNumber", text(passport, "number"));
        applicant.put("passportIssuedBy", text(passport, "issuedBy"));
        applicant.put("passportIssueDate", ruDate(text(passport, "issueDate")));
        applicant.put("address", registrationAddress(address));
        applicant.put("phone", text(contact, "phone"));
        applicant.put("email", orAbsent(text(contact, "email")));
        return applicant;
    }

    /** «Иванова Анна Сергеевна» → «А. С. Иванова» — the form used next to a signature line. */
    private static String shortName(String lastName, String firstName, String middleName) {
        StringBuilder initials = new StringBuilder();
        if (!firstName.isBlank()) {
            initials.append(firstName.charAt(0)).append(". ");
        }
        if (!middleName.isBlank()) {
            initials.append(middleName.charAt(0)).append(". ");
        }
        return (initials + lastName).trim();
    }

    private String registrationAddress(JsonNode address) {
        String apartment = text(address, "apartment");
        return joinNonBlank(", ",
                text(address, "postalCode"),
                text(address, "region"),
                text(address, "city"),
                text(address, "street"),
                text(address, "house"),
                apartment.isBlank() ? "" : "кв. " + apartment);
    }

    private void creditors(JsonNode entries, Map<String, Object> model) {
        List<Map<String, Object>> creditors = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (JsonNode entry : iterate(entries)) {
            Map<String, Object> creditor = new HashMap<>();
            creditor.put("index", String.valueOf(creditors.size() + 1));
            creditor.put("name", text(entry, "name"));
            creditor.put("inn", orAbsent(text(entry, "inn")));
            creditor.put("address", text(entry, "address"));
            creditor.put("debtAmount", money(entry.get("debtAmount")));
            creditor.put("debtType", orAbsent(text(entry, "debtType")));
            creditors.add(creditor);
            total = total.add(entry.get("debtAmount").decimalValue());
        }
        model.put("creditors", creditors);
        model.put("creditorCount", String.valueOf(creditors.size()));
        model.put("totalDebt", formatMoney(total));
    }

    private List<Map<String, Object>> debts(JsonNode entries) {
        List<Map<String, Object>> debts = new ArrayList<>();
        for (JsonNode entry : iterate(entries)) {
            Map<String, Object> debt = new HashMap<>();
            debt.put("index", String.valueOf(debts.size() + 1));
            debt.put("creditorName", text(entry, "creditorName"));
            debt.put("amount", money(entry.get("amount")));
            debt.put("overdueSinceDate", ruDateOrAbsent(text(entry, "overdueSinceDate")));
            debt.put("type", orAbsent(text(entry, "type")));
            debts.add(debt);
        }
        return debts;
    }

    private List<Map<String, Object>> propertyItems(JsonNode entries) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (JsonNode entry : iterate(entries)) {
            items.add(Map.of(
                    "index", String.valueOf(items.size() + 1),
                    "description", text(entry, "description"),
                    "estimatedValue", moneyOrAbsent(entry.get("estimatedValue"))));
        }
        return items;
    }

    private List<Map<String, Object>> realEstate(JsonNode entries) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (JsonNode entry : iterate(entries)) {
            items.add(Map.of(
                    "index", String.valueOf(items.size() + 1),
                    "type", text(entry, "type"),
                    "address", text(entry, "address"),
                    "area", numberOrAbsent(entry.get("area")),
                    "ownershipShare", orAbsent(text(entry, "ownershipShare"))));
        }
        return items;
    }

    private List<Map<String, Object>> vehicles(JsonNode entries) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (JsonNode entry : iterate(entries)) {
            items.add(Map.of(
                    "index", String.valueOf(items.size() + 1),
                    "type", text(entry, "type"),
                    "brand", orAbsent(text(entry, "brand")),
                    "model", orAbsent(text(entry, "model")),
                    "year", numberOrAbsent(entry.get("year")),
                    "regNumber", orAbsent(text(entry, "regNumber"))));
        }
        return items;
    }

    private List<Map<String, Object>> bankAccounts(JsonNode entries) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (JsonNode entry : iterate(entries)) {
            items.add(Map.of(
                    "index", String.valueOf(items.size() + 1),
                    "bankName", text(entry, "bankName"),
                    "accountNumber", text(entry, "accountNumber"),
                    "balance", moneyOrAbsent(entry.get("balance"))));
        }
        return items;
    }

    private Map<String, Object> monthlyIncome(JsonNode income) {
        return Map.of(
                "amount", money(income.get("amount")),
                "source", text(income, "source"));
    }

    // --- value helpers ------------------------------------------------------------

    private static Iterable<JsonNode> iterate(JsonNode entries) {
        return entries == null ? List.of() : entries;
    }

    /** The field's text, or "" when the field is absent/null — never a NullPointerException. */
    private static String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || value.isNull()) {
            return "";
        }
        return (value.isString() ? value.stringValue() : value.toString()).trim();
    }

    private static String orAbsent(String value) {
        return value.isBlank() ? ABSENT : value;
    }

    private static String numberOrAbsent(JsonNode value) {
        return value == null || value.isNull() ? ABSENT : value.toString();
    }

    private String ruDate(String isoDate) {
        return LocalDate.parse(isoDate).format(RU_DATE);
    }

    private String ruDateOrAbsent(String isoDate) {
        return isoDate.isBlank() ? ABSENT : ruDate(isoDate);
    }

    private static String money(JsonNode value) {
        return formatMoney(value.decimalValue());
    }

    private static String moneyOrAbsent(JsonNode value) {
        return value == null || value.isNull() ? ABSENT : money(value);
    }

    /** 1250000.5 → «1 250 000,50»: space-grouped, comma decimal, always two decimals. */
    static String formatMoney(BigDecimal amount) {
        String plain = amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
        String[] parts = plain.split("\\.");
        StringBuilder grouped = new StringBuilder();
        String digits = parts[0];
        for (int i = 0; i < digits.length(); i++) {
            if (i > 0 && (digits.length() - i) % 3 == 0) {
                grouped.append(' ');
            }
            grouped.append(digits.charAt(i));
        }
        return grouped + "," + parts[1];
    }

    private static String joinNonBlank(String separator, String... values) {
        List<String> present = new ArrayList<>();
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                present.add(value);
            }
        }
        return String.join(separator, present);
    }
}
