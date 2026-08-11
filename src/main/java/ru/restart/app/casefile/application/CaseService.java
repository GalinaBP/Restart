package ru.restart.app.casefile.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.common.error.ResourceNotFoundException;
import ru.restart.app.common.security.CurrentUser;

import java.util.UUID;

@Service
public class CaseService {

    private final CaseRepository cases;
    private final CurrentUser currentUser;

    public CaseService(CaseRepository cases, CurrentUser currentUser) {
        this.cases = cases;
        this.currentUser = currentUser;
    }

    @Transactional
    public BankruptcyCase create() {
        UUID userId = currentUser.require().userId();
        if (cases.findActiveByUserId(userId).isPresent()) {
            throw new ActiveCaseExistsException();
        }
        return cases.save(BankruptcyCase.startDraft(userId));
    }

    @Transactional(readOnly = true)
    public BankruptcyCase current() {
        return cases.findActiveByUserId(currentUser.require().userId())
                .orElseThrow(() -> new ResourceNotFoundException("У вас пока нет начатого дела"));
    }

    @Transactional(readOnly = true)
    public BankruptcyCase get(UUID caseId) {
        return cases.findById(caseId)
                .filter(c -> c.isOwnedBy(currentUser.require().userId()))
                .orElseThrow(() -> new ResourceNotFoundException("Дело не найдено"));
    }
}
