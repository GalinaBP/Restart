# Test-suite traceability (backlog AI-010)

Every functional requirement of the Document Builder backlog (AI-001…AI-009) traced to the
automated tests that pin it. The full suite runs in CI on every PR (`.github/workflows/ci.yml`):
backend `./mvnw verify` — unit + architecture + Testcontainers integration against real MySQL —
plus frontend eslint / tsc / vitest. A CI guard fails the build if any test is skipped, so the
integration layer can never silently drop out.

Counts at the time of writing: **188 backend tests** (26 of them Testcontainers integration),
**15 frontend tests**.

| Req | Requirement (short) | Pinned by |
|---|---|---|
| AI-001 | Case created in draft, linked to user, unique id | `CaseServiceTest`, `CaseControllerTest`, `CaseFlowIntegrationTest` (register → create → 409 on second → stranger 404); FK in `V2` |
| AI-002 | All 16 sections collectable, addressable, repeatable entries, resumable | `SectionServiceTest`, `SectionControllerTest`, `YamlSectionRegistryTest` (every SectionKey defined, ordered), `SectionFlowIntegrationTest` (add/remove entries, overview resume); wizard: `SectionPage.test.tsx`, `JourneyPage.test.tsx` |
| AI-003 | Deterministic validators: required, dates, RF passport, INN checksum, duplicates, empty mandatory sections; errors addressed to field | `CaseValidatorTest` (29 cases, valid/invalid/edge per rule, real ФНС checksums), `ValidationControllerTest` (exact section/entry/field addressing), `ValidationFlowIntegrationTest` (save bad → report → fix → clean) |
| AI-004 | Save on every step, partial data persists, failures surfaced with retry — never silently dropped | Server: every `SectionService` save test persists partial data (validation never blocks). Client: `SectionPage.test.tsx` «keeps the form and the typed data when the save itself fails» |
| AI-005 | Six versioned templates, shared boilerplate once, version tracked per document | `JMustacheTemplateRendererTest` (partials in every output, version from manifest, fail-fast), `GoldenFileRegressionTest` (output pinned byte-for-byte per document) |
| AI-006 | All six documents generated in one run from validated data; formats; format-agnostic engine | `DocumentGenerationServiceTest` (6 types × TXT+DOCX), `CaseModelAssemblerTest` (mapping/formatting), `DocxDocumentWriterTest` (OOXML validity), `FullCaseRenderingTest` (assembled model ↔ real templates contract), `DocumentFlowIntegrationTest` |
| AI-007 | Hard gate + structured missing list linking back to steps | `DocumentGenerationServiceTest` (exact missing combinations), `DocumentControllerTest` (409 GENERATION_BLOCKED shape), `DocumentsPage.test.tsx` (items link to `/journey/<step>`) |
| AI-008 | Edits regenerate all documents; stale superseded, never silent | `RegenerationFlowTest` (regenerate on valid edit, stale on invalid edit, clear on fix, stable ids), `DocumentFlowIntegrationTest` (over HTTP) |
| AI-009 | One package with all documents, blocked exactly like generation | `DocumentGenerationServiceTest` (zip entries byte-equal to stored docs; blocked), `DocumentControllerTest` (zip headers), `DocumentFlowIntegrationTest` (fix → export → unzip 12) |

## Documented design decisions (the backlog asked for these explicitly)

- **Auto-save (AI-004):** the server persists on every step submission (`PUT` per section, partial
  data always accepted). The client saves on explicit «Сохранить и дальше», not per keystroke —
  that *is* the debounce strategy: one write per completed step, no write flood, nothing lost
  between steps. A failed save keeps the form state and shows an inline retry.
- **Full regeneration (AI-008):** every document derives from the whole case model (totals and
  lists cross sections), so all documents regenerate together; document ids stay stable.
- **Export format (AI-009):** zip, not combined PDF; export regenerates before bundling behind
  the same gate, so a stale package is impossible. Since the PDF format landed, the zip carries
  txt + docx + pdf per document automatically (the writer port keeps the engine format-agnostic;
  `PdfDocumentWriterTest` pins Cyrillic extraction, pagination, wrapping, glyph sanitization).
- **Golden files (AI-005/AI-010):** template output changes must be deliberate — the regeneration
  workflow is documented in `GoldenFileRegressionTest`.
