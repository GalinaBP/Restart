# What the tests cover

The map from what the product promises to the test that pins it. It is written for whoever is
about to change something and wants to know what will catch them.

Counts as of 2026-08-29: **78 backend tests** (12 of them Testcontainers integration) and
**181 frontend tests** across 23 files.

## Running them

```bash
./mvnw clean verify                        # backend: unit + architecture + Testcontainers
./mvnw test -Dtest=ModularityTest          # one class
cd frontend && npm run lint && npm run build && npm test
```

CI (`.github/workflows/ci.yml`) runs both halves on every PR, plus `npm run rules:check`, which
regenerates `frontend/src/generated/` from `rules/` and fails on any drift.

**A skipped test fails the build on CI.** The integration tests are annotated
`@Testcontainers(disabledWithoutDocker = true)`, so without a Docker daemon they vanish quietly
instead of failing — the guard in the workflow asserts that the skip count is zero, which is the
only reason the integration layer cannot silently drop out.

Locally that guard does not exist, and on Colima the default is exactly the silent case: plain
`./mvnw verify` leaves all 19 integration tests skipped and still prints BUILD SUCCESS. The full
suite needs the daemon pointed at and Ryuk disabled (the API version is pinned in `pom.xml`) —

```bash
TESTCONTAINERS_RYUK_DISABLED=true ./mvnw clean verify
```

— with `docker.host` set in `~/.testcontainers.properties`. Why each of the three is needed is in
[CLAUDE.md](../CLAUDE.md). Check the run said `Skipped: 0` before believing a local green build.

## The browser carries the case, so most of the coverage is there

Since the local-first move (`docs/local-first-plan.md`) validation, the case model, the document
renderer and the PDF writer all run on the device. `frontend/src/test/setup.ts` gives each test
`fake-indexeddb` and wipes the database afterwards, so every one of them starts from an empty case.

| What must hold | Pinned by |
|---|---|
| Answers are validated deterministically — required fields, types, money, per-entry addressing, case-insensitive duplicate creditors, mandatory sections that are still empty | `local/validate.test.ts` (31 cases) |
| The model the documents are built from: the applicant composed from four sections, creditors indexed and totalled, the court derived from the registration region (with the honest placeholder when nothing matches), thousands grouped, halves rounded up, and the float error of summing kopecks survived | `local/model.test.ts` (9) |
| The five documents keep their exact wording, and the renderer keeps jmustache's whitespace behaviour rather than the mustache spec's | `local/mustache.test.ts` — one golden file per document (5) + the whitespace rules the templates were written against (5) |
| The PDFs are real files carrying Cyrillic, paginated, wrapped at the last space that fits, hard-broken when there is none, with unavailable glyphs sanitised | `local/pdf.test.ts` (7) |
| Every character the five documents can produce exists in the subset font — and the subset is genuinely trimmed | `local/fontCoverage.test.ts` (6) |
| The rules hang together: a label for every section, field and stage; a derivation rule for every derived stage; each branch one continuous path; fees as two-decimal strings, never floats | `local/rules.test.ts` (8) |
| A case survives leaving the device and coming back: ciphertext only, a passphrase worth having, an honest message on the wrong one, documents rebuilt rather than imported | `local/backup.test.ts` (9), `pages/BackupPage.test.tsx` (6) |
| The screening asks only the questions that follow from the answers and ends in one of four honest verdicts | `pages/EligibilityPage.test.tsx` (11) |
| The case screens: the journey and the papers that match the work answers (9), the whole path with statuses, fees, deadlines and branches (16), a wizard step that keeps the typed data when a save fails (7), documents blocked with links to the exact missing steps (3), the manager step (7), the filing checklist (5), controlled fields across added and removed entries (1) | `pages/JourneyPage`, `ProcedurePage`, `SectionPage`, `DocumentsPage`, `ManagerPage`, `FilingChecklist`, `AboutYouPage` |
| The supportive corner and the way in: scripts and templates that copy even when the Clipboard API is refused (6), sign-in, registration and password reset showing the backend's message as-is (3 + 3), the landing's single call to action (3) | `pages/CalmPage`, `AuthPage`, `ResetPasswordPage`, `App.test.tsx` |
| Date and list logic that would be tedious to prove through the UI: late and disputed claims, the nearest upcoming hearing, correspondence newest-first | `pages/flagClaims` (9), `nextUpcomingHearing` (6), `sortCorrespondence` (6) |

## What the server still has to get right

| What must hold | Pinned by |
|---|---|
| Register, log in, refresh, `me` — email normalised, password hashed, duplicates rejected regardless of case, and failures uniform so an unknown email cannot be told from a wrong password | `AuthServiceTest` (9), `AuthControllerTest` (9), `AuthFlowIntegrationTest` (6, Testcontainers) |
| Access and refresh tokens are not interchangeable, expired and tampered ones are refused, and a short or missing secret fails at boot | `JwtTokenServiceTest` (6) |
| Password reset: only the token hash is stored, the link is single-use, expires after an hour, and a new request retires the old one — with an enumeration-safe 204 either way | `PasswordResetServiceTest` (8), `PasswordResetFlowIntegrationTest` (6, Testcontainers) |
| Registration can be closed without breaking sign-in, and the refusal is plain Russian | `RegistrationClosedControllerTest` (1), `AuthServiceTest` |
| The screening rules: the size of the debt decides nothing on its own, bailiffs are ordinary, «not recommended» outranks everything, costs come before the lawyer referral, not knowing is itself a reason to ask — and the reasons are written for the user, not for lawyers | `EligibilityRulesTest` (21), `EligibilityControllerTest` (6) |
| Module boundaries: a module may depend only on another's `api`, `common` never on a business module, the domain never on infrastructure or on web/persistence frameworks | `ModularityTest` (2), `LayeredArchitectureTest` (4) |

## Changing a document on purpose

`local/mustache.test.ts` renders each document from the fixture case and compares it byte-for-byte
with `local/golden/<version>/<name>.txt`. When a golden file is absent the test writes it and then
fails — so the workflow for a deliberate wording change is: delete the golden, run the test, and
read the diff as what it is, the document somebody will file with a court. The goldens came from
the Java renderer while both existed; with one implementation left they are frozen wording, not a
cross-check.

## What nothing here covers

- **No end-to-end test.** Nothing drives a real browser against a running stack; the screens are
  covered at the Testing Library level, with the network stubbed.
- **Two tabs of the same browser.** They share one IndexedDB and can overwrite each other's last
  write. Untested, and unhandled.
- **How a PDF looks.** `pdf.test.ts` asserts extracted text, pagination and wrapping — not pixels,
  fonts on the page, or what a court clerk sees.
- **Storage eviction.** The case can be evicted by the browser; nothing simulates that, and the
  encrypted export in `/backup` is the whole recovery story.
- **Whether any of the legal content is right.** Every rule, threshold, fee and template is a
  placeholder pending lawyer review — the tests pin the wording, never its correctness. The open
  questions are in [lawyer-review.md](lawyer-review.md).

## Where the old version of this file went

Until 2026-08-15 this document traced the AI-001…AI-009 Document Builder backlog to the backend
tests that pinned it — `CaseServiceTest`, `CaseValidatorTest`, `JMustacheTemplateRendererTest`,
`GoldenFileRegressionTest` and the rest. The `casefile` and `doctemplate` modules were deleted when
the case moved into the browser, and their tests went with them; the requirements they pinned are
now pinned by `frontend/src/local/`. Git history holds the old mapping if the trace is ever needed.
