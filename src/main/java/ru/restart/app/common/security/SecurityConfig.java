package ru.restart.app.common.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import java.util.List;

/**
 * Central, stateless security policy for the platform. Individual modules refine authorization at
 * the service layer (ownership checks); this class only enforces coarse URL/role rules and wires
 * the shared 401/403 responses. The actual token authentication filter is contributed by the
 * {@code auth} module through {@link HttpSecurityCustomizer}, keeping {@code common} free of any
 * dependency on business modules.
 *
 * <p><strong>Note:</strong> Swagger and API-docs are permitted here for convenience. In production
 * they must be disabled — see {@code application-prod.yml} and {@code docs/security.md}.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    /**
     * Delegating encoder: encodes new passwords with BCrypt by default while still being able to
     * verify Argon2/other prefixed hashes. Never store plaintext.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    /** No-op default so the chain builds even before the {@code auth} module registers its filter. */
    @Bean
    @ConditionalOnMissingBean(HttpSecurityCustomizer.class)
    public HttpSecurityCustomizer noOpHttpSecurityCustomizer() {
        return http -> { };
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   List<HttpSecurityCustomizer> customizers,
                                                   RestAuthenticationEntryPoint authenticationEntryPoint,
                                                   RestAccessDeniedHandler accessDeniedHandler) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> { })
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        // The eligibility check runs before any account exists.
                        .requestMatchers(HttpMethod.POST, "/api/v1/eligibility/check").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**",
                                "/actuator/info").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable);

        for (HttpSecurityCustomizer customizer : customizers) {
            customizer.customize(http);
        }
        return http.build();
    }
}
