/**
 * Case management: the bankruptcy case is the container for everything a user collects and
 * generates on the way to filing (backlog AI-001). A case belongs to exactly one user (resolved
 * through {@code common.security.CurrentUser} — this module never depends on {@code auth}) and
 * moves draft → in_progress → ready → filed. Collected data sections (AI-002), auto-save (AI-004),
 * and generated documents live in later backlog tasks; this module deliberately starts as just the
 * case lifecycle.
 */
package ru.restart.app.casefile;
