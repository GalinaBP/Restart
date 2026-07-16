package ru.restart.app.casefile.domain;

/**
 * Kind of proceeding the case prepares. Only personal bankruptcy exists today; the type is stored
 * from day one so future kinds (e.g. business bankruptcy) reuse the same case model — see backlog
 * AI-001 developer notes.
 */
public enum CaseType {
    PERSONAL_BANKRUPTCY
}
