package ru.restart.app.casefile.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.casefile.domain.CaseStatus;
import ru.restart.app.casefile.domain.CaseType;
import ru.restart.app.common.error.ResourceNotFoundException;
import ru.restart.app.common.security.AuthenticatedUser;
import ru.restart.app.common.security.CurrentUser;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

/** Use-case tests with an in-memory repository and a stubbed caller — no Spring context. */
class CaseServiceTest {

    private final InMemoryCases cases = new InMemoryCases();
    private final StubCurrentUser currentUser = new StubCurrentUser();

    private CaseService service;

    @BeforeEach
    void setUp() {
        service = new CaseService(cases, currentUser);
        currentUser.actAs(UUID.randomUUID());
    }

    @Test
    void createStartsADraftPersonalCaseOwnedByTheCaller() {
        BankruptcyCase created = service.create();

        assertThat(created.status()).isEqualTo(CaseStatus.DRAFT);
        assertThat(created.type()).isEqualTo(CaseType.PERSONAL_BANKRUPTCY);
        assertThat(created.isOwnedBy(currentUser.userId)).isTrue();
        assertThat(cases.findById(created.id())).isPresent();
    }

    @Test
    void caseIdsAreUnique() {
        BankruptcyCase first = service.create();
        currentUser.actAs(UUID.randomUUID());
        BankruptcyCase second = service.create();

        assertThat(first.id()).isNotEqualTo(second.id());
    }

    @Test
    void secondActiveCaseIsRejected() {
        service.create();

        assertThatExceptionOfType(ActiveCaseExistsException.class).isThrownBy(service::create);
    }

    @Test
    void aFiledCaseNoLongerBlocksANewOne() {
        BankruptcyCase created = service.create();
        cases.replace(new BankruptcyCase(created.id(), created.userId(), created.type(),
                CaseStatus.FILED, null));

        assertThat(service.create().status()).isEqualTo(CaseStatus.DRAFT);
    }

    @Test
    void currentReturnsTheActiveCase() {
        BankruptcyCase created = service.create();

        assertThat(service.current().id()).isEqualTo(created.id());
    }

    @Test
    void currentWithoutACaseIsNotFound() {
        assertThatExceptionOfType(ResourceNotFoundException.class).isThrownBy(service::current);
    }

    @Test
    void getReturnsTheCallersCaseById() {
        BankruptcyCase created = service.create();

        assertThat(service.get(created.id()).id()).isEqualTo(created.id());
    }

    @Test
    void someoneElsesCaseIsAnsweredLikeAMissingOne() {
        BankruptcyCase created = service.create();
        currentUser.actAs(UUID.randomUUID());

        assertThatExceptionOfType(ResourceNotFoundException.class)
                .isThrownBy(() -> service.get(created.id()));
        assertThatExceptionOfType(ResourceNotFoundException.class)
                .isThrownBy(() -> service.get(UUID.randomUUID()));
    }

    @Test
    void anonymousCallersCannotCreateACase() {
        currentUser.actAs(null);

        assertThatExceptionOfType(AuthenticationCredentialsNotFoundException.class)
                .isThrownBy(service::create);
    }

    // --- test doubles -----------------------------------------------------------

    private static final class InMemoryCases implements CaseRepository {
        private final Map<UUID, BankruptcyCase> byId = new HashMap<>();

        @Override
        public BankruptcyCase save(BankruptcyCase bankruptcyCase) {
            byId.put(bankruptcyCase.id(), bankruptcyCase);
            return bankruptcyCase;
        }

        void replace(BankruptcyCase bankruptcyCase) {
            byId.put(bankruptcyCase.id(), bankruptcyCase);
        }

        @Override
        public Optional<BankruptcyCase> findById(UUID id) {
            return Optional.ofNullable(byId.get(id));
        }

        @Override
        public Optional<BankruptcyCase> findActiveByUserId(UUID userId) {
            return byId.values().stream()
                    .filter(c -> c.isOwnedBy(userId) && c.isActive())
                    .findFirst();
        }
    }

    private static final class StubCurrentUser implements CurrentUser {
        private UUID userId;

        void actAs(UUID userId) {
            this.userId = userId;
        }

        @Override
        public Optional<AuthenticatedUser> get() {
            return Optional.ofNullable(userId)
                    .map(id -> new AuthenticatedUser(id, "user@mail.ru", "ROLE_USER"));
        }

        @Override
        public AuthenticatedUser require() {
            return get().orElseThrow(() -> new AuthenticationCredentialsNotFoundException("none"));
        }
    }
}
