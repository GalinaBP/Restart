package ru.restart.app.casefile.infrastructure;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.restart.app.casefile.application.DocumentGenerationService;
import ru.restart.app.casefile.application.GenerationBlockedException;
import ru.restart.app.casefile.domain.CaseDocument;
import ru.restart.app.common.web.ApiPaths;
import ru.restart.app.common.web.CorrelationId;

import java.util.List;
import java.util.UUID;

/**
 * The generated filing package of a case (backlog AI-006). Ownership follows the case endpoints;
 * generation is hard-gated on a clean validation report — the client is expected to check
 * {@code GET /cases/{id}/validation} first and will get a 409 here otherwise.
 */
@RestController
@RequestMapping(ApiPaths.API_V1 + "/cases/{caseId}/documents")
@Tag(name = "Case documents", description = "Generate and download the filing package")
public class DocumentController {

    private final DocumentGenerationService service;

    public DocumentController(DocumentGenerationService service) {
        this.service = service;
    }

    @Operation(summary = "Generate the filing package",
            description = "Renders all six documents in every supported format (txt, docx) from "
                    + "the current case data and the active template version, replacing any "
                    + "previously generated files. While validation reports any issue, responds "
                    + "409 GENERATION_BLOCKED with the `missing` list — each item addressed to "
                    + "the workflow step (section), entry, and field that fixes it.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public List<DocumentResponse> generate(@PathVariable UUID caseId) {
        return service.generate(caseId).stream().map(DocumentResponse::from).toList();
    }

    @Operation(summary = "List generated documents",
            description = "Metadata of the case's generated files; empty until first generation.")
    @GetMapping
    public List<DocumentResponse> list(@PathVariable UUID caseId) {
        return service.list(caseId).stream().map(DocumentResponse::from).toList();
    }

    @Operation(summary = "Export the filing package",
            description = "One ZIP with every generated file, regenerated from the current data "
                    + "just before bundling — the package can never contain stale documents. The "
                    + "same 409 GENERATION_BLOCKED contract applies while the case is incomplete. "
                    + "Format choice (zip, not combined PDF) is documented in the service.")
    @PostMapping("/export")
    public ResponseEntity<byte[]> export(@PathVariable UUID caseId) {
        byte[] zip = service.exportPackage(caseId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("restart-filing-package.zip")
                        .build()
                        .toString())
                .body(zip);
    }

    /**
     * The AI-007 blocking screen contract. Controller-local so it takes precedence over the
     * generic BusinessException mapping in {@code GlobalExceptionHandler} without any advice
     * ordering: same ApiError shape, plus the structured {@code missing} list.
     */
    @ExceptionHandler(GenerationBlockedException.class)
    public ResponseEntity<MissingInfoResponse> handleBlocked(GenerationBlockedException ex,
                                                             HttpServletRequest request) {
        MissingInfoResponse body = MissingInfoResponse.of(ex.status().value(),
                ex.errorCode().name(), ex.getMessage(), request.getRequestURI(),
                CorrelationId.current(), ex.issues());
        return ResponseEntity.status(ex.status()).body(body);
    }

    @Operation(summary = "Download one document",
            description = "The file bytes with the proper content type and attachment filename.")
    @GetMapping("/{documentId}")
    public ResponseEntity<byte[]> download(@PathVariable UUID caseId,
                                           @PathVariable UUID documentId) {
        CaseDocument document = service.download(caseId, documentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.format().mediaType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(document.filename())
                        .build()
                        .toString())
                .body(document.content());
    }
}
