package ru.restart.app.auth.infrastructure;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import ru.restart.app.common.security.HttpSecurityCustomizer;

/**
 * Contributes the JWT authentication filter to the shared filter chain via the
 * {@link HttpSecurityCustomizer} extension point declared in {@code common}. The filter is
 * deliberately <em>not</em> a Spring bean: Boot auto-registers filter beans with the servlet
 * container, which would run it a second time outside the security chain.
 */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
class AuthSecurityConfig {

    @Bean
    HttpSecurityCustomizer jwtHttpSecurityCustomizer(JwtTokenService tokenService) {
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(tokenService);
        return http -> http.addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class);
    }
}
