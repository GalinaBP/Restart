package ru.restart.app.casefile.domain;

/**
 * Stages of the court-supervised bankruptcy procedure (backlog AI-018), one per screen of the
 * journey map. Order, branch membership and the 127-ФЗ provision each stage traces back to live
 * in {@code casefile/journey.yml} — placeholder content pending lawyer review; this enum only
 * fixes the addressable set of stages.
 *
 * <p>Not to be confused with {@link SectionKey}: those are the questionnaire steps <em>inside</em>
 * the {@link #DOCUMENT_PREPARATION} stage.
 */
public enum JourneyStage {
    SCREENING,
    DOCUMENT_PREPARATION,
    MANAGER_SELECTION,
    FEES_AND_DEPOSIT,
    FILING,
    COURT_DECISION,
    // One branch per procedure the court can apply (AI-024); only one is ever visible at a time.
    RESTRUCTURING_PLAN,
    RESTRUCTURING_PLAN_APPROVAL,
    RESTRUCTURING_EXECUTION,
    PROPERTY_INVENTORY,
    PROPERTY_REALIZATION,
    CREDITOR_PAYOUTS,
    SETTLEMENT_TERMS,
    SETTLEMENT_AGREEMENT,
    CREDITOR_CLAIMS,
    COMPLETION
}
