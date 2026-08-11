package ru.restart.app.common.security;

import java.util.Optional;

public interface CurrentUser {

    Optional<AuthenticatedUser> get();

    AuthenticatedUser require();
}
