package ru.restart.app.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/** Enables Spring Data JPA auditing so {@code @CreatedDate}/{@code @LastModifiedDate} are populated. */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
