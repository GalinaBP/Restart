package ru.restart.app.doctemplate.api;

public enum DocumentType {
    BANKRUPTCY_APPLICATION("bankruptcy_application"),
    CREDITOR_LIST("creditor_list"),
    PROPERTY_INFORMATION("property_information"),
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
