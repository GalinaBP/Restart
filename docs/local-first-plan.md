# Local-first case data — migration plan

**Status: phases 0–3 shipped on 2026-08-15. Phase 4 (deleting the server side) is not done.**
The requirement was stated on
2026-08-11: *all user data must remain local to the user's browser/device*, in the part of the
product that prepares documents. The accompanying product line is «Мы считаем, что вам не
обязательно передавать такие данные стороннему сервису только для того, чтобы организовать их и
подготовить информацию.»

The product owner chose **option A** (§5) with the account kept for now, a staged server-side
removal, and a one-time import of cases still held on the server (§9). Sections 1–5 below
describe the situation as it was before the change and are kept as the reasoning behind it;
§6 marks what is done, and §11 records what shipped and what is still open.

This document says what the app did, what that requirement cost, and in what order it was
delivered.

## 1. Where user data lives today

Today the app is the opposite of local-first: everything the user types is sent to the backend and
persisted in MySQL, which on Railway is a hosted third-party database.

| What | Where | Contains |
|------|-------|----------|
| Every answer in the wizard | `case_section.payload` (`JSON`), V3 | Passport, registration address, contacts, employment, income, marital status, dependents, creditors, bank accounts, real estate, vehicles, payments — 21 sections |
| The generated filings | `case_document.content` (`MEDIUMBLOB`), V4 | The five rendered PDFs, i.e. the same personal data in final assembled form |
| Case state | `bankruptcy_case`, V2 | Status, procedure type, ownership |
| Journey progress | `case_journey_stage`, V8 | Recorded stage statuses, dates, free-text notes |
| Account | `user_account`, V1 | Email, password hash |

The only user data on the device today is the JWT pair in `localStorage`
(`frontend/src/api/client.ts`). The eligibility screening is the one part that already complies —
it is stateless and anonymous, and stores nothing.

## 2. Why moving only document rendering is not enough

The obvious reading of the requirement is "generate the PDFs in the browser". On its own that
changes nothing: the documents are assembled from `case_section.payload`, which is already on the
server. Rendering the last step locally while the passport number sits in MySQL does not reduce
what the user hands over — it only moves where the bytes are stitched together.

**The claim in the product line is earned only if the answers themselves stop being sent.** That
means `case_section` goes away, and with it the server-side validation report, the journey's
derived stages, and account-based recovery. This is an architectural change to `casefile`, not a
change to the documents feature.

## 3. What each piece costs to move

The good news: almost everything that would have to run in the browser is already pure logic over
the section payloads plus static YAML. Nothing in the generation path needs the database except
the reads that fetch the payloads.

| Piece | Today | Size | Portability |
|-------|-------|------|-------------|
| Validation engine | `casefile/domain/CaseValidator.java` | 160 lines | **Easy.** Pure function of `SectionDefinition` + JSON. No DB, no Spring. |
| Template model assembly | `casefile/application/CaseModelAssembler.java` | 276 lines | **Easy.** Pure mapping from payloads + `courts.yml`/`fees.yml` + `Clock`. |
| Derived journey stages | `casefile/application/JourneyService.java` | 155 lines | **Easy.** The derivation rules read section payloads only. |
| Config and content | `sections.yml`, `journey.yml`, `fees.yml`, `courts.yml`, `claim-deadline.yml` | 665 lines | **Easy.** Static. Ship as JSON assets built at compile time; the SPA already renders the wizard from field metadata it fetches. |
| Mustache templates | `doctemplates/2026-06-21.1/` — 5 documents + 4 partials | — | **Easy.** jmustache → mustache.js, same syntax including partials. The versioned-directory + `manifest.yml` scheme survives unchanged. |
| PDF writer | `casefile/infrastructure/PdfDocumentWriter.java` | 113 lines | **Moderate but small.** PDFBox is barely used: monospace DejaVu Sans Mono, fixed character-width wrapping, plain lines on A4. No layout engine. `pdf-lib` + `fontkit` reproduce it in a comparable amount of code. |
| Zip export | `DocumentGenerationService.exportPackage` | ~20 lines | **Easy.** `JSZip`, or skip the zip and save five files. |

Bundle cost is the one real tax: `pdf-lib` plus the 333 KB `DejaVuSansMono.ttf` against a current
bundle of 331 KB (103 KB gzipped). Both must be lazy-loaded on the documents screen only, and the
font should be subset to Cyrillic + Latin first.

Golden-file regression tests (`GoldenFileRegressionTest`, `FullCaseRenderingTest`) are the safety
net for the port: the browser renderer must reproduce the pinned outputs byte-for-byte before the
server-side one is deleted.

## 4. Where the data would live instead

**IndexedDB**, not `localStorage`: structured, no 5 MB ceiling, and the PDFs are blobs.

The hazard that has to be designed for, not documented away: **browser storage is evictable.**
Clearing site data, private-mode sessions, iOS's 7-day eviction of unused site data, or simply
switching devices all destroy the case. Today the server is the backup; local-first removes it.
So an **export/import file is not a nice-to-have, it is the recovery story** and must ship in the
same release as local storage — a single encrypted `.restart` file the user saves themselves, with
the app prompting for it at each meaningful milestone.

## 5. Three shapes to choose from

**A. Fully local, no server-side case.** Answers and documents never leave the device; the backend
keeps the screening, the static content and the templates. Matches the stated requirement and the
product line exactly. Costs: no multi-device, no recovery except the export file, and the account
loses most of its purpose — `user_account`, the JWT filter and the password-reset flow would be
carrying almost nothing, which is itself an argument for dropping the account and making the whole
product anonymous.

**B. End-to-end encrypted sync.** The server still stores a blob, but it is ciphertext encrypted
under a key derived from a passphrase that is never transmitted. Keeps multi-device and backup;
the operator genuinely cannot read the case. Costs: real cryptographic design (key derivation, key
rotation, "forgot passphrase" means the data is gone), and it does not match the copy as written —
data *is* transmitted, just unreadable. The sentence would have to be reworded.

**C. Documents-only local.** Rejected in §2 — it does not earn the claim.

**Recommendation: A**, for this ICP. The narrow ICP is a single person preparing one filing over
weeks on, realistically, one device; the constitution already promises anonymity; and A is the only
option where the promise is structurally true rather than policy-true. B is the right answer if
multi-device turns out to matter more than the wording of the claim — that is a product call.

## 6. Delivery order

Each phase leaves the app working; nothing here is a big-bang cutover.

0. ✅ **Extract the rules into shared assets.** Build `sections.yml`, `journey.yml`, `fees.yml`,
   `courts.yml` into JSON emitted at build time and consumed by both sides. No behaviour change.
1. ✅ **Port validation + model assembly to TypeScript**, running *alongside* the server versions and
   asserted equal in tests. Highest-risk logic, verified before anything depends on it.
2. ✅ **Port the renderer**: mustache + pdf-lib behind a lazy chunk, pinned against the existing
   golden files. At the end of this phase the browser can produce the filings itself.
3. ✅ **Move the store.** Case data goes to IndexedDB; export/import ships in the same release. The
   `/cases/**` endpoints stop being called.
4. ⬜ **Delete the server side**: `case_section`, `case_document`, `case_journey_stage`, the
   controllers, and — if the account goes too — `user_account` and the `auth` module. Schema
   removal needs Flyway migrations and the retired-enum precedent in `CLAUDE.md` applies: rows
   holding values the code no longer knows must be handled, not just dropped.

## 7. What the user loses, and what we owe them

| Loss | Mitigation |
|------|------------|
| Case survives only on one device | Export/import file, prompted at milestones (§4) |
| Clearing browser data destroys the case | Explicit, repeated, honest warning at case creation; export prompt |
| No "log in from the new laptop" | The export file is the migration path; say so plainly |
| Support cannot inspect a broken case | The user can send their export file if they choose to |

Every one of these must be said in plain language before the user starts entering data, not in a
policy page. Trading recovery for privacy is a real trade and the user is entitled to make it
knowingly.

## 8. When the product line can ship

Not yet, but only for want of a decision, not for want of truth. The landing's trust block was
built deliberately from claims that are true and checkable in the code, and
«не передавать такие данные стороннему сервису» *is* now true of everything the app collects
about the bankruptcy: the answers, the journey and the documents never leave the browser.

Two caveats before anyone writes it on the landing:

- **The account is not covered by it.** Email and password still go to the server, and sign-in is
  still required. A line about "not handing your data over" next to a registration form needs
  wording that does not read as covering the account too.
- **It should not appear as a general claim about "the service".** The screening is anonymous and
  the case is local, but the sentence is worth pinning to what it actually describes.

## 9. Open questions — answered 2026-08-15

1. **Option A or B** (§5) → **A**, fully local, no server-side case.
2. **Does the account survive?** → Yes, for now. Sign-in still gates the app; the case is local
   regardless. Dropping `auth` stays available as a later step, and until it happens the copy has
   to be honest that the account is not where the case lives.
3. **Does the requirement reach backwards?** → A case still held on the server is pulled into the
   browser once, on first load, and the server is not used again (`local/serverImport.ts`).
   Nobody loses work in progress. That path is temporary and goes away with phase 4.
4. **Lawyer:** does anything in 127-ФЗ or the court process require the operator to retain a copy
   of what was filed? This plan assumes not. **Still unanswered — see `docs/lawyer-review.md`.**

## 10. Documentation defects found while surveying

Fixed on 2026-08-15: `CLAUDE.md` claimed **eight** filing documents in **txt + docx + pdf**, where
`DocumentType` has **five** values and `DocumentFormat` has only `PDF` (txt and docx were retired
in V11).

## 11. What shipped, and what is left

Shipped (phases 0–3):

- `npm run rules` generates the SPA's copy of `sections.yml`, `journey.yml`, `fees.yml`,
  `courts.yml`, `claim-deadline.yml`, the mustache templates and the DejaVu font into
  `frontend/src/generated/`, cross-checking the keys against the Java enums. CI runs
  `npm run rules:check` and fails on drift. The yml files stay the single place rules are authored.
- `frontend/src/local/` carries the ported engine: validation, model assembly, the template
  renderer, the PDF writer, the derived journey stages, fees and the claim deadline.
- The case lives in IndexedDB. No screen calls `/cases/**`.
- `/backup` writes and reads one passphrase-encrypted `.restart` file; the eviction warning is on
  the case-creation screen, the documents screen and the backup screen.
- A case still on the server is imported once, then the server is left alone.

Left:

- **Phase 4**, the deletion, with its Flyway migrations.
- **Bundle cost.** `pdf-lib` is 1.1 MB (506 kB gzip) and the font another 340 kB, both lazy on the
  documents screen. Subsetting the font to Cyrillic + Latin is the cheap win; a smaller PDF writer
  is the larger one.
- **Multi-tab.** Two tabs of the same browser share one IndexedDB and will happily overwrite each
  other's last write. Nothing corrupts, but a `BroadcastChannel` refresh would be kinder.
- **The landing copy** (§8), which is a product decision, not an engineering one.
