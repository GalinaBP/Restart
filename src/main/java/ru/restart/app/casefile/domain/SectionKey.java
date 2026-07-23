package ru.restart.app.casefile.domain;

/**
 * Machine keys of the data-collection sections (backlog AI-002), one per step of the journey. The
 * definition of each section — its order, fields, repeatability, and the 127-ФЗ provision it
 * traces back to — lives in {@code casefile/sections.yml}, which is placeholder content pending
 * lawyer review; this enum only fixes the addressable set of steps.
 */
public enum SectionKey {
    PERSONAL_DETAILS,
    PASSPORT,
    REGISTRATION_ADDRESS,
    CONTACT_INFO,
    EMPLOYMENT,
    MONTHLY_INCOME,
    OTHER_INCOME,
    MARITAL_STATUS,
    DEPENDENTS,
    CREDITORS,
    BANK_ACCOUNTS,
    REAL_ESTATE,
    VEHICLES,
    COURT_PROCEEDINGS,
    ENFORCEMENT_PROCEEDINGS
}
