package ru.restart.app.auth.infrastructure;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.restart.app.auth.domain.UserAccount;
import ru.restart.app.auth.domain.UserAccountRepository;

/**
 * Seeds one demo account for local development. Runs only when {@code restart.seed.enabled=true},
 * which is set in {@code application-local.yml} and nowhere else — with no default profile and no
 * default for the flag, a prod deployment can never seed accounts accidentally.
 */
@Component
@ConditionalOnProperty(name = "restart.seed.enabled", havingValue = "true")
class LocalUserSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalUserSeeder.class);

    static final String DEMO_EMAIL = "demo@restart.local";
    static final String DEMO_PASSWORD = "demo-restart-1";

    private final UserAccountRepository accounts;
    private final PasswordEncoder passwordEncoder;

    LocalUserSeeder(UserAccountRepository accounts, PasswordEncoder passwordEncoder) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (accounts.existsByEmail(DEMO_EMAIL)) {
            return;
        }
        accounts.save(UserAccount.register(DEMO_EMAIL, passwordEncoder.encode(DEMO_PASSWORD)));
        log.info("Seeded local demo account {} / {}", DEMO_EMAIL, DEMO_PASSWORD);
    }
}
