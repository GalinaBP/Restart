package ru.restart.app.doctemplate.api;

/**
 * The documents of the filing package (backlog AI-005, extended by AI-020). {@code templateName}
 * is the file base name inside a template version directory.
 */
public enum DocumentType {
    BANKRUPTCY_APPLICATION("bankruptcy_application"),
    CREDITOR_LIST("creditor_list"),
    PROPERTY_INFORMATION("property_information"),
    DEBT_SUMMARY("debt_summary"),
    SRO_NOMINATION("sro_nomination"),
    PAYMENT_INSTRUCTIONS("payment_instructions"),
    ATTACHMENTS_CHECKLIST("attachments_checklist"),
    FILING_CHECKLIST("filing_checklist");

    private final String templateName;

    DocumentType(String templateName) {
        this.templateName = templateName;
    }

    public String templateName() {
        return templateName;
    }
}
