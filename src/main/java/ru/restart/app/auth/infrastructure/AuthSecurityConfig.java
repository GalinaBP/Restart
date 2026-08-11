package ru.restart.app.auth.infrastructure;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import ru.restart.app.common.security.HttpSecurityCustomizer;

@Configuration
@EnableConfigurationProperties(JwtProperties.class)
class AuthSecurityConfig {

    @Bean
    HttpSecurityCustomizer jwtHttpSecurityCustomizer(JwtTokenService tokenService) {
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(tokenService);
        return http -> http.addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class);
    }
}
