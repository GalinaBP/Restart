package ru.restart.app.casefile.infrastructure;

import org.springframework.stereotype.Component;
import ru.restart.app.casefile.domain.CaseSection;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.SectionKey;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA-backed implementation of the section persistence port. Save is an upsert on the section's
 * id: re-submitting a step updates the existing row (the unique {@code (case_id, section_key)}
 * constraint backs this at the database level).
 */
@Component
class CaseSectionRepositoryAdapter implements CaseSectionRepository {

    private final CaseSectionJpaRepository jpa;

    CaseSectionRepositoryAdapter(CaseSectionJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public CaseSection save(CaseSection section) {
        CaseSectionEntity entity = jpa.findById(section.id())
                .map(existing -> {
                    existing.setPayload(section.payloadJson());
                    return existing;
                })
                .orElseGet(() -> new CaseSectionEntity(section.id(), section.caseId(),
                        section.key(), section.payloadJson()));
        return toDomain(jpa.save(entity));
    }

    @Override
    public Optional<CaseSection> findByCaseIdAndKey(UUID caseId, SectionKey key) {
        return jpa.findByCaseIdAndSectionKey(caseId, key).map(this::toDomain);
    }

    @Override
    public List<CaseSection> findByCaseId(UUID caseId) {
        return jpa.findByCaseId(caseId).stream().map(this::toDomain).toList();
    }

    private CaseSection toDomain(CaseSectionEntity entity) {
        return new CaseSection(entity.getId(), entity.getCaseId(), entity.getSectionKey(),
                entity.getPayload());
    }
}
