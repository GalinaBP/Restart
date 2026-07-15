/**
 * Accounts and authentication: registration, login, stateless JWT issuing/verification, and the
 * current-user profile. Contributes its JWT authentication filter to the shared security filter
 * chain through {@code common.security.HttpSecurityCustomizer}; other modules never see tokens —
 * they consume the authenticated principal via {@code common.security.CurrentUser}.
 */
package ru.restart.app.auth;
