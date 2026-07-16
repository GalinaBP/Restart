package ru.restart.app.casefile.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.common.error.ResourceNotFoundException;
import ru.restart.app.common.security.CurrentUser;

import java.util.UUID;

/**
 * Case lifecycle use cases (backlog AI-001). Ownership is enforced here, at the service layer, per
 * the platform's security convention: a case that exists but belongs to someone else is answered
 * exactly like a case that does not exist, so case ids cannot be probed.
 */
@Service
public class CaseService {

    private final CaseRepository cases;
    private final CurrentUser currentUser;

    public CaseService(CaseRepository cases, CurrentUser currentUser) {
        this.cases = cases;
        this.currentUser = currentUser;
    }

    /** Starts the caller's case in {@code DRAFT}; at most one active case per user. */
    @Transactional
    public BankruptcyCase create() {
        UUID userId = currentUser.require().userId();
        if (cases.findActiveByUserId(userId).isPresent()) {
            throw new ActiveCaseExistsException();
        }
        return cases.save(BankruptcyCase.startDraft(userId));
    }

    /** The caller's active case — the one the journey screen resumes into. */
    @Transactional(readOnly = true)
    public BankruptcyCase current() {
        return cases.findActiveByUserId(currentUser.require().userId())
                .orElseThrow(() -> new ResourceNotFoundException("У тебя пока нет начатого дела"));
    }

    /** A case by id, only if the caller owns it; otherwise indistinguishable from "not found". */
    @Transactional(readOnly = true)
    public BankruptcyCase get(UUID caseId) {
        return cases.findById(caseId)
                .filter(c -> c.isOwnedBy(currentUser.require().userId()))
                .orElseThrow(() -> new ResourceNotFoundException("Дело не найдено"));
    }
}
