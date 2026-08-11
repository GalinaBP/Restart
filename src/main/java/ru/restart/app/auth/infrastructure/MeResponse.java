package ru.restart.app.auth.infrastructure;

import ru.restart.app.auth.domain.UserAccount;

import java.util.UUID;

public record MeResponse(UUID id, String email, String role) {

    static MeResponse from(UserAccount account) {
        return new MeResponse(account.id(), account.email(), account.role().name());
    }
}
