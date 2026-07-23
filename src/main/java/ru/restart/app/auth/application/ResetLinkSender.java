package ru.restart.app.auth.application;

/**
 * Delivery port for the reset link. The infrastructure layer decides how it travels: real email
 * when SMTP is configured, the application log otherwise (private-beta fallback — the operator
 * passes the link on by hand).
 */
public interface ResetLinkSender {

    void send(String email, String resetLink);
}
