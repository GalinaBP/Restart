package ru.restart.app.auth.application;

public interface ResetLinkSender {

    void send(String email, String resetLink);
}
