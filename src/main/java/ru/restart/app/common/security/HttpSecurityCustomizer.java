package ru.restart.app.common.security;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;

@FunctionalInterface
public interface HttpSecurityCustomizer {

    void customize(HttpSecurity http) throws Exception;
}
