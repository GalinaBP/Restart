package ru.restart.app.auth.application;

import ru.restart.app.auth.domain.UserAccount;

import java.util.Optional;
import java.util.UUID;

/**
 * Port for issuing and verifying the stateless token pair. Implemented in infrastructure (JWT);
 * the application layer never touches token internals.
 */
public interface TokenService {

    IssuedTokens issue(UserAccount account);

    /**
     * The account id from a valid, unexpired refresh token; empty for anything else (malformed,
     * expired, wrong signature, or an access token presented as a refresh token).
     */
    Optional<UUID> parseRefreshToken(String refreshToken);
}
