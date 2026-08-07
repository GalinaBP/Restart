package ru.restart.app.eligibility.domain;

/**
 * What the person owns. A home on its own is the simple case this product is built for; a vehicle,
 * land, a share or anything unnamed is a case the court will look at closely.
 * PLACEHOLDER pending lawyer review.
 */
public enum PropertyItem {
    /** Nothing beyond ordinary personal belongings. */
    NOTHING,
    VEHICLE,
    HOME,
    LAND,
    PROPERTY_SHARE,
    OTHER,
    UNKNOWN
}
