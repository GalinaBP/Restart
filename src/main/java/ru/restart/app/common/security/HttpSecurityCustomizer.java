package ru.restart.app.common.security;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;

/**
 * Extension point that lets a business module (notably {@code auth}) contribute to the shared
 * {@link org.springframework.security.web.SecurityFilterChain} — e.g. by registering a JWT
 * authentication filter — without {@code common} depending on that module. {@code common} defines
 * the contract and provides a no-op default; {@code auth} overrides it.
 */
@FunctionalInterface
public interface HttpSecurityCustomizer {

    void customize(HttpSecurity http) throws Exception;
}
