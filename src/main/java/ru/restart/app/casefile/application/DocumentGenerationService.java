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

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

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

    @Transactional
    public List<CaseDocument> generate(UUID caseId) {
        BankruptcyCase bankruptcyCase = caseService.get(caseId);
        var issues = validationService.validateCase(bankruptcyCase.id());
        if (!issues.isEmpty()) {
            throw new GenerationBlockedException(issues);
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
                                writer.write(rendered), false))
                        .orElseGet(() -> CaseDocument.of(bankruptcyCase.id(), type,
                                writer.format(), rendered.templateVersion(),
                                writer.write(rendered)));
                generated.add(documents.save(document));
            }
        }
        return generated;
    }

    @Transactional
    public byte[] exportPackage(UUID caseId) {
        List<CaseDocument> generated = new ArrayList<>(generate(caseId));
        generated.sort(Comparator
                .comparing((CaseDocument d) -> d.type().ordinal())
                .thenComparing(d -> d.format().ordinal()));
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            for (CaseDocument document : generated) {
                zip.putNextEntry(new ZipEntry(document.filename()));
                zip.write(document.content());
                zip.closeEntry();
            }
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot build the export package", ex);
        }
        return out.toByteArray();
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
