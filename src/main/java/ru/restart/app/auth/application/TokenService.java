package ru.restart.app.auth.application;

import ru.restart.app.auth.domain.UserAccount;

import java.util.Optional;
import java.util.UUID;

public interface TokenService {

    IssuedTokens issue(UserAccount account);

    Optional<UUID> parseRefreshToken(String refreshToken);
}
