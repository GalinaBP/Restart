package ru.restart.app.eligibility.domain;

/**
 * A three-way answer. "Not sure" is a real answer here, not a missing one: on the questions that
 * use it, not knowing is itself a reason to have a lawyer look.
 */
public enum YesNoUnsure {
    NO,
    YES,
    UNSURE
}
