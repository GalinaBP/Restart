package ru.restart.app.casefile.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CaseValidatorTest {

    private final CaseValidator validator = new CaseValidator();
    private final ObjectMapper json = new ObjectMapper();

    private static final SectionDefinition PASSPORT_LIKE = new SectionDefinition(
            SectionKey.PASSPORT, 1, false, true, "тест", List.of(),
            List.of(new FieldDefinition("series", FieldType.PASSPORT_SERIES, true),
                    new FieldDefinition("number", FieldType.PASSPORT_NUMBER, true),
                    new FieldDefinition("issueDate", FieldType.DATE, true),
                    new FieldDefinition("inn", FieldType.INN, false),
                    new FieldDefinition("note", FieldType.STRING, false)));

    private static final SectionDefinition CREDITORS_LIKE = new SectionDefinition(
            SectionKey.CREDITORS, 2, true, true, "тест", List.of("name", "inn"),
            List.of(new FieldDefinition("name", FieldType.STRING, true),
                    new FieldDefinition("inn", FieldType.INN, false),
                    new FieldDefinition("address", FieldType.STRING, true),
                    new FieldDefinition("debtAmount", FieldType.MONEY, true)));

    private static final SectionDefinition OPTIONAL_LIST = new SectionDefinition(
            SectionKey.VEHICLES, 3, true, false, "тест", List.of(),
            List.of(new FieldDefinition("type", FieldType.STRING, true),
                    new FieldDefinition("year", FieldType.INTEGER, false)));

    private JsonNode parse(String content) {
        return json.readTree(content);
    }

    @Test
    void mandatorySectionMissingOrEmptyIsFlagged() {
        assertThat(validator.validateSection(PASSPORT_LIKE, null))
                .extracting(ValidationIssue::code)
                .containsExactly(ValidationCode.SECTION_EMPTY);
        assertThat(validator.validateSection(PASSPORT_LIKE, parse("{}")))
                .extracting(ValidationIssue::code)
                .containsExactly(ValidationCode.SECTION_EMPTY);
        assertThat(validator.validateSection(CREDITORS_LIKE, parse("[]")))
                .extracting(ValidationIssue::code)
                .containsExactly(ValidationCode.SECTION_EMPTY);
    }

    @Test
    void optionalSectionMayStayEmpty() {
        assertThat(validator.validateSection(OPTIONAL_LIST, null)).isEmpty();
        assertThat(validator.validateSection(OPTIONAL_LIST, parse("[]"))).isEmpty();
    }

    @Test
    void missingAndBlankRequiredFieldsAreFlaggedPerField() {
        List<ValidationIssue> issues = validator.validateSection(PASSPORT_LIKE,
                parse("{\"series\": \"  \", \"number\": null}"));

        assertThat(issues)
                .extracting(ValidationIssue::field)
                .containsExactlyInAnyOrder("series", "number", "issueDate");
        assertThat(issues)
                .allSatisfy(issue -> assertThat(issue.code())
                        .isEqualTo(ValidationCode.REQUIRED_FIELD_MISSING));
    }

    @Test
    void optionalFieldsMayBeAbsentButAreValidatedWhenPresent() {
        List<ValidationIssue> withoutInn = validator.validateSection(PASSPORT_LIKE,
                parse("{\"series\": \"1234\", \"number\": \"567890\", \"issueDate\": \"2020-01-15\"}"));
        assertThat(withoutInn).isEmpty();

        List<ValidationIssue> withBadInn = validator.validateSection(PASSPORT_LIKE,
                parse("{\"series\": \"1234\", \"number\": \"567890\", "
                        + "\"issueDate\": \"2020-01-15\", \"inn\": \"123\"}"));
        assertThat(withBadInn)
                .extracting(ValidationIssue::code)
                .containsExactly(ValidationCode.INVALID_INN);
    }

    @ParameterizedTest
    @ValueSource(strings = {"123", "12345", "12a4", "1234 "})
    void passportSeriesMustBeFourDigits(String series) {
        List<ValidationIssue> issues = validator.validateSection(PASSPORT_LIKE,
                parse("{\"series\": \"%s\", \"number\": \"567890\", \"issueDate\": \"2020-01-15\"}"
                        .formatted(series)));

        assertThat(issues)
                .extracting(ValidationIssue::code)
                .containsExactly(ValidationCode.INVALID_PASSPORT_SERIES);
    }

    @ParameterizedTest
    @ValueSource(strings = {"12345", "1234567", "56789a"})
    void passportNumberMustBeSixDigits(String number) {
        List<ValidationIssue> issues = validator.validateSection(PASSPORT_LIKE,
                parse("{\"series\": \"1234\", \"number\": \"%s\", \"issueDate\": \"2020-01-15\"}"
                        .formatted(number)));

        assertThat(issues)
                .extracting(ValidationIssue::code)
                .containsExactly(ValidationCode.INVALID_PASSPORT_NUMBER);
    }

    @ParameterizedTest
    @ValueSource(strings = {"15.01.2020", "2020-13-01", "2020-02-30", "yesterday", "2020"})
    void malformedDatesAreFlagged(String date) {
        List<ValidationIssue> issues = validator.validateSection(PASSPORT_LIKE,
                parse("{\"series\": \"1234\", \"number\": \"567890\", \"issueDate\": \"%s\"}"
                        .formatted(date)));

        assertThat(issues)
                .extracting(ValidationIssue::code)
                .containsExactly(ValidationCode.INVALID_DATE);
    }

    @ParameterizedTest
    @ValueSource(strings = {"7707083893", "500100732259"})
    void validInnsPassTheChecksum(String inn) {
        assertThat(CaseValidator.innChecksumValid(inn)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"7707083894", "500100732258", "0000000001"})
    void innsWithWrongCheckDigitsFail(String inn) {
        assertThat(CaseValidator.innChecksumValid(inn)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"123", "77070838930", "7707O83893"})
    void innsOfWrongLengthOrWithNonDigitsAreFlagged(String inn) {
        List<ValidationIssue> issues = validator.validateSection(PASSPORT_LIKE,
                parse("{\"series\": \"1234\", \"number\": \"567890\", "
                        + "\"issueDate\": \"2020-01-15\", \"inn\": \"%s\"}".formatted(inn)));

        assertThat(issues)
                .extracting(ValidationIssue::code)
                .containsExactly(ValidationCode.INVALID_INN);
    }

    @Test
    void moneyMustBeANonNegativeNumber() {
        String template = "[{\"name\": \"Банк\", \"address\": \"Москва\", \"debtAmount\": %s}]";

        assertThat(validator.validateSection(CREDITORS_LIKE, parse(template.formatted("125000.50"))))
                .isEmpty();
        assertThat(validator.validateSection(CREDITORS_LIKE, parse(template.formatted("-1"))))
                .extracting(ValidationIssue::code)
                .containsExactly(ValidationCode.INVALID_MONEY);
        assertThat(validator.validateSection(CREDITORS_LIKE, parse(template.formatted("\"много\""))))
                .extracting(ValidationIssue::code)
                .containsExactly(ValidationCode.INVALID_MONEY);
    }

    @Test
    void integerAndStringTypesAreChecked() {
        assertThat(validator.validateSection(OPTIONAL_LIST,
                parse("[{\"type\": \"авто\", \"year\": 2015}]"))).isEmpty();
        assertThat(validator.validateSection(OPTIONAL_LIST,
                parse("[{\"type\": \"авто\", \"year\": \"позапрошлый\"}]")))
                .extracting(ValidationIssue::code)
                .containsExactly(ValidationCode.INVALID_TYPE);
        assertThat(validator.validateSection(OPTIONAL_LIST,
                parse("[{\"type\": 12}]")))
                .extracting(ValidationIssue::code)
                .containsExactly(ValidationCode.INVALID_TYPE);
    }

    @Test
    void entryFindingsCarryTheEntryIndex() {
        List<ValidationIssue> issues = validator.validateSection(CREDITORS_LIKE,
                parse("[{\"name\": \"Банк\", \"address\": \"Москва\", \"debtAmount\": 100}, "
                        + "{\"name\": \"МФО\", \"debtAmount\": 50}]"));

        assertThat(issues).hasSize(1);
        assertThat(issues.get(0).entryIndex()).isEqualTo(1);
        assertThat(issues.get(0).field()).isEqualTo("address");
        assertThat(issues.get(0).code()).isEqualTo(ValidationCode.REQUIRED_FIELD_MISSING);
    }

    @Test
    void duplicateCreditorsAreDetectedCaseInsensitively() {
        List<ValidationIssue> issues = validator.validateSection(CREDITORS_LIKE,
                parse("[{\"name\": \"Банк Восход\", \"inn\": \"7707083893\", "
                        + "\"address\": \"Москва\", \"debtAmount\": 100}, "
                        + "{\"name\": \"банк восход\", \"inn\": \"7707083893\", "
                        + "\"address\": \"Москва\", \"debtAmount\": 200}]"));

        assertThat(issues).hasSize(1);
        assertThat(issues.get(0).code()).isEqualTo(ValidationCode.DUPLICATE_ENTRY);
        assertThat(issues.get(0).entryIndex()).isEqualTo(1);
    }

    @Test
    void sameNameWithDifferentInnIsNotADuplicate() {
        List<ValidationIssue> issues = validator.validateSection(CREDITORS_LIKE,
                parse("[{\"name\": \"Банк\", \"inn\": \"7707083893\", "
                        + "\"address\": \"Москва\", \"debtAmount\": 100}, "
                        + "{\"name\": \"Банк\", \"inn\": \"500100732259\", "
                        + "\"address\": \"Тверь\", \"debtAmount\": 200}]"));

        assertThat(issues).isEmpty();
    }
}
