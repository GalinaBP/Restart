package ru.restart.app.casefile;

import ru.restart.app.casefile.domain.CaseSection;
import ru.restart.app.casefile.domain.SectionKey;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * One fully valid, ICP-realistic case (young consumer debtor, no property) shared by generation
 * tests: passes the real validation rules of sections.yml with zero issues. Kept as raw JSON —
 * the exact shape the HTTP API accepts — so the same fixtures serve unit, web-slice, and
 * integration tests.
 */
public final class CaseFixtures {

    private CaseFixtures() {
    }

    public static final Map<SectionKey, String> VALID_SECTIONS = validSections();

    private static Map<SectionKey, String> validSections() {
        Map<SectionKey, String> sections = new LinkedHashMap<>();
        sections.put(SectionKey.PERSONAL_DETAILS, """
                {"lastName": "Иванова", "firstName": "Анна", "middleName": "Сергеевна",
                 "birthDate": "1999-05-20", "birthPlace": "г. Москва",
                 "inn": "500100732259", "snils": "112-233-445 95"}""");
        sections.put(SectionKey.PASSPORT, """
                {"series": "4519", "number": "123456",
                 "issuedBy": "ГУ МВД России по г. Москве", "issueDate": "2019-06-14"}""");
        sections.put(SectionKey.REGISTRATION_ADDRESS, """
                {"region": "г. Москва", "city": "Москва", "street": "ул. Ленина",
                 "house": "д. 1", "apartment": "2", "postalCode": "101000"}""");
        sections.put(SectionKey.CONTACT_INFO, """
                {"phone": "+7 900 000-00-00", "email": "anna@example.com"}""");
        sections.put(SectionKey.EMPLOYMENT, """
                {"status": "работаю по найму", "employerName": "ООО «Ромашка»",
                 "position": "менеджер"}""");
        sections.put(SectionKey.MONTHLY_INCOME, """
                {"amount": 85000.50, "source": "заработная плата"}""");
        sections.put(SectionKey.OTHER_INCOME, """
                [{"source": "сдача комнаты в аренду", "amount": 15000}]""");
        sections.put(SectionKey.MARITAL_STATUS, """
                {"status": "не замужем"}""");
        sections.put(SectionKey.CREDITORS, """
                [{"name": "ПАО «Банк Восход»", "inn": "7707083893",
                  "address": "г. Москва, ул. Банковская, д. 3",
                  "debtAmount": 1000000, "debtType": "потребительский кредит",
                  "overdueSinceDate": "2026-02-01"},
                 {"name": "МФО «Деньги-Быстро»",
                  "address": "г. Тверь, пр-т Займов, д. 7", "debtAmount": 250000.50}]""");
        sections.put(SectionKey.MANAGER_SRO, """
                {"name": "Ассоциация «СРО арбитражных управляющих «Содействие»»",
                 "address": "г. Москва, ул. Управляющая, д. 5",
                 "inn": "7707083893", "ogrn": "1027700132195", "registryNumber": "0012"}""");
        return sections;
    }

    /** The fixtures as persisted sections of the given case. */
    public static List<CaseSection> validCaseSections(UUID caseId) {
        List<CaseSection> sections = new ArrayList<>();
        VALID_SECTIONS.forEach((key, json) -> sections.add(CaseSection.of(caseId, key, json)));
        return sections;
    }
}
