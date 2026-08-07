package ru.restart.app.eligibility.domain;

/**
 * Entrepreneur or company status, now or recently. The law treats an entrepreneur's bankruptcy
 * differently from a private person's, so anything but "none" or plain self-employment routes to
 * a lawyer. PLACEHOLDER pending lawyer review.
 */
public enum BusinessStatus {
    NONE,
    /** Self-employed without registering as an entrepreneur. */
    SELF_EMPLOYED,
    CURRENT_ENTREPRENEUR,
    RECENTLY_CLOSED_ENTREPRENEUR,
    COMPANY_OWNER
}
