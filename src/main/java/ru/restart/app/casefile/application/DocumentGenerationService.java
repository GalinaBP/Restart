package ru.restart.app.casefile.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.restart.app.casefile.domain.BankruptcyCase;
import ru.restart.app.casefile.domain.CaseDocument;
import ru.restart.app.casefile.domain.CaseDocumentRepository;
import ru.restart.app.casefile.domain.CaseSectionRepository;
import ru.restart.app.casefile.domain.DocumentFileWriter;
import ru.restart.app.common.error.ResourceNotFoundException;
import ru.restart.app.doctemplate.api.DocumentTemplates;
import ru.restart.app.doctemplate.api.DocumentType;
import ru.restart.app.doctemplate.api.RenderedDocument;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The document-generation engine (backlog AI-006). One run renders all six documents of the
 * filing package in every configured file format. Generation is a hard-gated, deterministic
 * pipeline: validated data → assembled model → versioned template → file bytes. Regeneration
 * replaces the stored files (upsert per case/type/format), so stale documents are superseded,
 * never left behind.
 */
@Service
public class DocumentGenerationService {

    private final CaseService caseService;
    private final ValidationService validationService;
    private final CaseSectionRepository sections;
    private final CaseDocumentRepository documents;
    private final CaseModelAssembler assembler;
    private final DocumentTemplates templates;
    private final List<DocumentFileWriter> writers;

    public DocumentGenerationService(CaseService caseService, ValidationService validationService,
                                     CaseSectionRepository sections,
                                     CaseDocumentRepository documents,
                                     CaseModelAssembler assembler, DocumentTemplates templates,
                                     List<DocumentFileWriter> writers) {
        this.caseService = caseService;
        this.validationService = validationService;
        this.sections = sections;
        this.documents = documents;
        this.assembler = assembler;
        this.templates = templates;
        this.writers = writers;
    }

    /** Generates the full package. Blocked entirely while the case has any validation issue. */
    @Transactional
    public List<CaseDocument> generate(UUID caseId) {
        BankruptcyCase bankruptcyCase = caseService.get(caseId);
        if (!validationService.validateCase(bankruptcyCase.id()).isEmpty()) {
            throw new GenerationBlockedException();
        }

        Map<String, Object> model = assembler.assemble(sections.findByCaseId(bankruptcyCase.id()));
        List<CaseDocument> generated = new ArrayList<>();
        for (DocumentType type : DocumentType.values()) {
            RenderedDocument rendered = templates.render(type, model);
            for (DocumentFileWriter writer : writers) {
                CaseDocument document = documents
                        .findByCaseIdAndTypeAndFormat(bankruptcyCase.id(), type, writer.format())
                        .map(existing -> new CaseDocument(existing.id(), existing.caseId(), type,
                                writer.format(), rendered.templateVersion(),
                                writer.write(rendered)))
                        .orElseGet(() -> CaseDocument.of(bankruptcyCase.id(), type,
                                writer.format(), rendered.templateVersion(),
                                writer.write(rendered)));
                generated.add(documents.save(document));
            }
        }
        return generated;
    }

    @Transactional(readOnly = true)
    public List<CaseDocument> list(UUID caseId) {
        return documents.findByCaseId(caseService.get(caseId).id());
    }

    @Transactional(readOnly = true)
    public CaseDocument download(UUID caseId, UUID documentId) {
        BankruptcyCase bankruptcyCase = caseService.get(caseId);
        return documents.findByIdAndCaseId(documentId, bankruptcyCase.id())
                .orElseThrow(() -> new ResourceNotFoundException("Документ не найден"));
    }
}
