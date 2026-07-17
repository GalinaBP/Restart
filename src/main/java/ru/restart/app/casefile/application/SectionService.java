package ru.restart.app.casefile.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseDocumentRepository;
import ru.restart.app.casefile.domain.CaseRepository;
import ru.restart.app.casefile.domain.CaseSection;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.CaseStatus;
import ru.restart.app.casefile.domain.SectionDefinition;
import ru.restart.app.casefile.domain.SectionKey;
import ru.restart.app.casefile.domain.SectionRegistry;
import tools.jackson.databind.JsonNode;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The step-by-step data collection (backlog AI-002). Every operation resolves the case through
 * {@link CaseService#get}, so ownership and existence rules are identical to the case endpoints.
 * Submitting a step replaces that section's data wholesale — for repeatable sections the client
 * sends the full entry list, which is also how entries are added and removed.
 *
 * <p>Regeneration on edit (AI-008): once documents exist, every saved step re-runs full
 * validation and — if the case is still clean — regenerates ALL documents synchronously (full
 * regeneration by design: every document derives from the whole case model, and twelve small
 * files render in milliseconds; partial tracking would add complexity without user value). If
 * the edit left the case invalid, regeneration is impossible (the AI-007 gate), so the existing
 * documents are flagged stale instead — superseded, never silently outdated.
 */
@Service
public class SectionService {

    private final CaseService caseService;
    private final CaseRepository cases;
    private final CaseSectionRepository sections;
    private final SectionRegistry registry;
    private final ValidationService validationService;
    private final DocumentGenerationService generationService;
    private final CaseDocumentRepository documents;

    public SectionService(CaseService caseService, CaseRepository cases,
                          CaseSectionRepository sections, SectionRegistry registry,
                          ValidationService validationService,
                          DocumentGenerationService generationService,
                          CaseDocumentRepository documents) {
        this.caseService = caseService;
        this.cases = cases;
        this.sections = sections;
        this.registry = registry;
        this.validationService = validationService;
        this.generationService = generationService;
        this.documents = documents;
    }

    /** The whole journey for one case: every section in order, with its filled state. */
    @Transactional(readOnly = true)
    public List<SectionOverview> overview(UUID caseId) {
        BankruptcyCase bankruptcyCase = caseService.get(caseId);
        Set<SectionKey> filled = sections.findByCaseId(bankruptcyCase.id()).stream()
                .map(CaseSection::key)
                .collect(Collectors.toSet());
        return registry.all().stream()
                .map(def -> new SectionOverview(def, filled.contains(def.key())))
                .toList();
    }

    /** One step's definition and data — what a resumed client prefills the screen from. */
    @Transactional(readOnly = true)
    public SectionContent get(UUID caseId, SectionKey key) {
        BankruptcyCase bankruptcyCase = caseService.get(caseId);
        SectionDefinition definition = registry.get(key);
        return new SectionContent(definition,
                sections.findByCaseIdAndKey(bankruptcyCase.id(), key)
                        .map(CaseSection::payloadJson)
                        .orElse(null));
    }

    /** Saves a step. The first saved step moves a draft case to {@code IN_PROGRESS}. */
    @Transactional
    public SectionContent put(UUID caseId, SectionKey key, JsonNode payload) {
        BankruptcyCase bankruptcyCase = caseService.get(caseId);
        SectionDefinition definition = registry.get(key);
        screen(definition, payload);

        String payloadJson = payload.toString();
        CaseSection saved = sections.save(
                sections.findByCaseIdAndKey(bankruptcyCase.id(), key)
                        .map(existing -> existing.withPayload(payloadJson))
                        .orElseGet(() -> CaseSection.of(bankruptcyCase.id(), key, payloadJson)));

        if (bankruptcyCase.status() == CaseStatus.DRAFT) {
            cases.save(bankruptcyCase.progressStarted());
        }
        refreshGeneratedDocuments(bankruptcyCase.id());
        return new SectionContent(definition, saved.payloadJson());
    }

    /** AI-008: documents follow the data — regenerate while valid, flag stale otherwise. */
    private void refreshGeneratedDocuments(UUID caseId) {
        if (documents.findByCaseId(caseId).isEmpty()) {
            return; // nothing generated yet — nothing can go stale
        }
        if (validationService.validateCase(caseId).isEmpty()) {
            generationService.generate(caseId);
        } else {
            documents.markAllStale(caseId);
        }
    }

    /**
     * Shape and field-name screening only: unknown data must not enter the case. Value-level
     * validation (formats, checksums, required fields) is the validation engine (AI-003).
     */
    private void screen(SectionDefinition definition, JsonNode payload) {
        if (payload == null || payload.isNull()) {
            throw new InvalidSectionPayloadException("Раздел не может быть пустым");
        }
        if (definition.repeatable()) {
            if (!payload.isArray()) {
                throw new InvalidSectionPayloadException(
                        "Этот раздел заполняется списком записей");
            }
            for (JsonNode entry : payload) {
                screenObject(definition, entry,
                        "Каждая запись раздела должна быть заполнена по форме");
            }
        } else {
            screenObject(definition, payload, "Этот раздел заполняется одной записью");
        }
    }

    private void screenObject(SectionDefinition definition, JsonNode node, String shapeMessage) {
        if (!node.isObject()) {
            throw new InvalidSectionPayloadException(shapeMessage);
        }
        Set<String> unknown = new LinkedHashSet<>();
        for (String name : node.propertyNames()) {
            if (!definition.fieldSet().contains(name)) {
                unknown.add(name);
            }
        }
        if (!unknown.isEmpty()) {
            throw new InvalidSectionPayloadException(
                    "В разделе есть неизвестные поля: " + String.join(", ", unknown));
        }
    }
}
