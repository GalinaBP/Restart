package ru.restart.app.casefile.domain;

/**
 * The procedure the court applies to the case (ст. 213.6 127-ФЗ; ПЛЕЙСХОЛДЕР pending lawyer
 * review). Recorded on the case once the court has decided, and from then on it selects which
 * branch of {@code journey.yml} the user is walked through (backlog AI-024).
 *
 * <p>Absent (null) on a case means the court has not decided yet — the common path applies and
 * no branch-specific stage is shown. The app never predicts which procedure the court will pick.
 */
public enum ProcedureType {
    /** Реструктуризация долгов — the debtor repays under a court-approved plan. */
    RESTRUCTURING,
    /** Реализация имущества — property is sold to satisfy creditors. */
    REALIZATION,
    /** Мировое соглашение — debtor and creditors settle and the case ends. */
    SETTLEMENT
}
