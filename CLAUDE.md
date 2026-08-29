# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Restart** (`ru.restart`) — a consumer app that guides a user through the Russian personal
bankruptcy procedure step by step, as a journey rather than bureaucracy. The product vision lives in
`../constitution.docx` (kept next to the repo, not inside it); its non-negotiables:

- Plain language everywhere — **no legal terminology in anything user-facing** (UI copy, error
  messages). Tone: "Сейчас нужно получить выписку", never "В соответствии с ФЗ…".
- One action per screen; only the next step is shown.
- Narrow ICP: unmarried, no car/real estate/business, ordinary consumer debts, a clean history
  behind them. Complex cases (assets, deals, divorce, business) must be detected early and routed
  to a lawyer — honestly. **The size of the debt is no longer part of the ICP** (2026-08-07): the
  screening collects it but never decides on it, and the old 350k–3M window and the ≤5-creditor
  limit are gone from the rules — `../constitution.docx` still says otherwise and needs updating.
- The app never promises guaranteed discharge of debts.

> Legal rules and questionnaire content are **placeholders pending lawyer review** — flag that when
> touching anything rule-like.

Architecture and conventions deliberately mirror the Adiaphora platform
(`~/Documents/job/adiaphora documents/adiaphora`) — same stack, same module layering, same
cross-cutting patterns — but this is an independent product and codebase; never import from or
couple to that repo.

## Commands

```bash
# One-time setup
cp .env.example .env

# Full stack (MySQL, backend, frontend), all with health checks
docker compose up --build
docker compose --profile dev-tools up --build   # + Adminer on :8081

# App only, against a MySQL you provide (local profile)
./mvnw spring-boot:run

# Full test suite: unit + integration (Testcontainers/real MySQL) + architecture
./mvnw clean verify

# Single test class / method
./mvnw test -Dtest=ModularityTest

# Frontend (in frontend/)
npm run dev          # Vite dev server on :3000, proxies /api to :8080
npm run build        # typecheck + production bundle
npm test             # vitest
npm run rules        # regenerate src/generated/ from rules/ (yml + templates + font)
npm run rules:check  # what CI runs: regenerate and fail on any diff
```

**Colima note.** On Colima with Docker Engine 29 the integration tests are *skipped*, not failed —
`@Testcontainers(disabledWithoutDocker = true)` swallows the reason — so a green `./mvnw verify`
locally may have touched no database at all. Three things have to be true; only the first lives in
`~/.testcontainers.properties`:

```
docker.host=unix:///Users/<you>/.colima/default/docker.sock
```

```bash
TESTCONTAINERS_RYUK_DISABLED=true ./mvnw clean verify -DargLine="-Dapi.version=1.44"
```

- **`docker.host`** — Colima creates no `/var/run/docker.sock`, so nothing finds the daemon by
  default. `DOCKER_HOST` in the environment does the same job.
- **`api.version`** — docker-java negotiates API 1.32 and Engine 29 refuses anything below 1.40
  («client version 1.32 is too old»). It has to reach the *forked test JVM* as a system property,
  which is why it goes through `argLine`; `.testcontainers.properties` does not carry this key, and
  upgrading Testcontainers does not change the default (tried 1.21.3, same 1.32).
- **Ryuk off, as an environment variable** — the reaper bind-mounts the socket path, which Colima's
  VM cannot mount («operation not supported»), and the `ryuk.disabled=true` line in
  `~/.testcontainers.properties` is *not* honoured. With it off, containers outliving a crashed JVM
  are nobody's job: check `docker ps -a`.

Verified 2026-08-29 on Colima, engine 29.5.2 / API 1.54: 78 tests, 0 skipped. CI needs none of
this, and its guard fails the build if anything is skipped there.

Swagger UI (`local` profile only, disabled in `prod`): http://localhost:8080/swagger-ui.html

## Architecture

One Spring Boot 4.1 / Java 21 **modular monolith**, one MySQL schema, one deployable artifact.
Feature modules live under `ru.restart.app`; `common` holds shared technical building blocks.

**The backend does not hold the bankruptcy case.** Since 2026-08-15 (phases 0–4 of
`docs/local-first-plan.md`) everything the debtor types — answers, journey, generated filings —
lives in their browser and is never sent. The `casefile` and `doctemplate` modules that used to
own it, and the four tables behind them, were deleted in phase 4; V12 is the migration that
dropped them. What remains server-side is deliberately small:

- `eligibility` — the 2-minute screening check: stateless, anonymous, stores nothing.
  Placeholder rules pending lawyer review.
- `auth` — accounts + stateless JWT (register/login/refresh/me), contributing its token filter via
  `HttpSecurityCustomizer`; local demo account seeded when `restart.seed.enabled=true`. It is the
  way in and nothing more: no case hangs off an account, so signing in on a second device shows an
  empty app, and the copy has to keep saying so.

> **The rules live in `rules/`** — the questionnaire, the journey, the fees, the courts, the claim
> deadline, and the versioned Mustache templates under `rules/doctemplates/<version>/` with
> `manifest.yml` naming the active edition and the five documents. They sat under
> `src/main/resources/` while Java read them; nothing on the server does any more, so they moved to
> where their location says what they are — product content, editable without touching code, all of
> it placeholder pending lawyer review. `rules/README.md` is the map.
>
> `frontend/scripts/generate-rules.mjs` compiles them into the SPA and is also the only thing that
> **validates** them: field types, duplicate keys, `uniqueBy` pointing at real fields, fee amounts
> quoted so YAML cannot turn them into floats, every partial a template references being listed.
> That was the Java registries' job — if you add a rule file, give it checks there, or nothing
> checks it. A legislative amendment is still an edit to the yml (or a new template version
> directory) plus `npm run rules`.

Every business module gets identical internal layering:

| Layer            | Responsibility                                                              |
|------------------|-----------------------------------------------------------------------------|
| `api`            | Public interfaces + DTOs other modules may use. No JPA entities exposed.     |
| `application`    | Use cases, command/query handlers, transactions, orchestration, mapping.     |
| `domain`         | Aggregates, value objects, domain services/events, repository interfaces.    |
| `infrastructure` | REST controllers, JPA entities, Spring Data repositories, adapters, config.  |

**Communication rules (mechanically enforced):**
- A module may depend only on another module's **`api`** package.
- Cross-module side effects flow through **Spring application events** (`common.event.DomainEvent`).
- `common` never depends on a business module.
- Enforced by `ModularityTest` (Spring Modulith) and `LayeredArchitectureTest` (ArchUnit), both part
  of `./mvnw verify`. The common-module rule is generic — it bites automatically for any new module.

**Cross-cutting concerns, all in `common`:**
- Errors: `GlobalExceptionHandler` maps everything to the `ApiError` contract; stable codes in
  `ErrorCode`; DB/framework messages never reach clients. User-facing messages are plain Russian.
- Correlation id: `CorrelationIdFilter` binds `X-Correlation-Id` to MDC, echoes it in responses.
- Security: stateless JWT, URL rules in `common.security.SecurityConfig`; the future `auth` module
  contributes its token filter via the `HttpSecurityCustomizer` extension point. Roles: `USER`, `ADMIN`.
- Time: inject the UTC `Clock` bean (`ClockConfig`); never call `Instant.now()` in domain code.

`src/main/resources/` is now only `application*.yml` and the Flyway migrations; the product content
that used to live beside them is in `rules/`.

**Database:** Flyway owns the schema (`src/main/resources/db/migration`, V1–V12); Hibernate
runs `ddl-auto: validate`. Only `user_account` and `password_reset_token` are left — V12 dropped
the four case tables. Add a migration in the same change as any new entity. UUIDs as
`BINARY(16)` (`UuidUtils`), money as `DECIMAL(19,2)`, timestamps UTC.

> **Deleting a stored enum constant needs a migration in the same change.** Nothing persisted is
> currently `@Enumerated(STRING)` — the enums that were (`SectionKey`, `DocumentType`,
> `JourneyStage`, `FeeItem` and friends) went with `casefile` — but the lesson cost a production
> outage and applies to the next one. A row holding a name the enum no longer knows cannot be
> mapped, and *every read of that table for that row throws*: the feature looks fine on fresh data
> and breaks only for users who already have the old value. V7 and V9 are the precedent, V9 having
> been written after shipping the removal without one took «Документы» and «Весь путь» down. Pin it
> the way `RetiredDocumentTypeIntegrationTest` did: insert the legacy row through JDBC, then assert
> the screens still answer.
>
> **The same trap now lives in the browser.** Document types are stored in IndexedDB by the `type`
> from `rules/doctemplates/manifest.yml`, and section keys index the saved answers — rename either and a
> user's existing case no longer lines up with the rules. There is no migration to write there, so
> the rule is simply: keys are permanent, and adding is safe where renaming is not.

**API conventions:** base path `/api/v1` (`ApiPaths`), JSON/camelCase, separate request/response
DTOs, Bean Validation on request bodies, `PageResponse` envelope for collections, OpenAPI on every
endpoint.

**Profiles:** no default profile — `local` (dev, Swagger on) or `prod` (everything from env, fails
fast) must be chosen explicitly; `test` is used by integration tests via Testcontainers.

## Code style

**No comments in code.** Java, TypeScript/TSX, CSS and HTML carry no explanatory comments — no
Javadoc, no file-header blocks, no inline notes, tests included. Every one of them was stripped on
2026-08-11 ([PR #71](https://github.com/GalinaBP/Restart/pull/71)), so anything added back
reintroduces exactly what was removed. Let names, types and structure carry the meaning, and put
the reasoning in the commit message or the pull request instead.

**Directives a tool reads are not comments** and stay where they are needed:
`// eslint-disable-next-line …`, `/// <reference types=…>`, `@ts-expect-error`, `prettier-ignore`.

The rule covers **code only**. `yml` config and data keep their comments — everything in `rules/`
and `application*.yml` carry the placeholder-pending-lawyer-review markers — as do the mustache templates (golden-file tests pin their output), `nginx.conf`,
the Dockerfiles, shell scripts and Markdown. **Never rewrite a Flyway migration just to tidy its
comments:** Flyway checksums each file, so editing one that has already run breaks `validate`
against every existing database, production included.

## Frontend

`frontend/` — React 19 + TypeScript + Vite SPA, served by nginx in Docker (static + SPA fallback,
no API proxy; the API base URL is baked in via the `VITE_API_BASE` build arg). It is no longer a
UI shell: since the local-first move it carries the whole case, including the rules that used to
be the backend's alone (see below). What still goes over the network is sign-in and the
anonymous screening. Copy style: warm, short, **formal second-person
plural ("Вы")**, zero legalese. (This reversed the constitution's original informal "ты" — a
product decision recorded in `../Corrections.xlsx`, 2026-07-21; `../constitution.docx` was brought
in line on 2026-08-03 and now reads "Вы" throughout.) Use lowercase «вы/вас/ваш» mid-sentence, capital only at the
start of a sentence. Visual style: a dark **"space" theme** — deep canvas (`--bg #0b0b12`), a
**solid green accent** (`#34d399`, no gradients) on buttons and text, soft green glows behind the
landing, big friendly type, pill shapes; calm, never loud (the subject matter is heavy). Green
buttons use dark ink text (`#04231a`) for contrast. The landing also carries a **decorative
cosmic layer** — a twinkling starfield, a rare shooting star, and warm-yellow `--star #fcd34d`
accents (2026-07-31): decoration only, never on buttons, links, or anything actionable, and all
motion is disabled under `prefers-reduced-motion`. Emoji: the landing keeps the single rocket
🚀, and the **screening questions (and their group headings) carry emoji** (2026-07-22 decision);
the **answer options do not** (emoji stripped from options on 2026-07-28); the **«Спокойно, это
нормально» section carries emoji throughout** (2026-08-03 — it is the app's supportive corner and
the ticket specified them); the rest of the app (wizard labels, journey, documents) stays
emoji-free. Design tokens live in
`frontend/src/styles.css` `:root`. (Earlier AI-011 experiments with an Adiaphora slate/green, a
light marketing landing, and a blue→cyan gradient were reverted.)

### Local-first case data

**Nothing the user types about their bankruptcy leaves the device** (2026-08-15, phases 0–3 of
`docs/local-first-plan.md`). Answers, journey progress and the generated PDFs live in
**IndexedDB**; `frontend/src/local/` holds the engine that used to be `casefile`'s: `validate.ts`,
`model.ts`, `mustache.ts`, `pdf.ts`, `journey.ts`, `store.ts`. `api/` now means what it says —
only `auth`, `eligibility` and the shared client are left in it.

- **The rules are still authored in yml on the backend.** `npm run rules` builds
  `src/generated/` (sections, journey, fees, courts, claim deadline, templates, the DejaVu font)
  and validates them on the way through; CI runs `npm run rules:check` and fails on drift.
  `local/rules.test.ts` covers what the generator cannot see — that every section and stage has a
  label, that every derived stage has a derivation rule. The generated files are committed because
  `frontend/Dockerfile` copies only `frontend/`. **Edit the yml, never `src/generated/`.**
- **The template renderer is hand-written on purpose.** `local/mustache.ts` reproduces
  jmustache's non-standards-mode whitespace handling, which differs from the mustache spec that
  mustache.js implements: a standalone partial's newline is swallowed *except* on a template's
  first line, while standalone comment and section lines always go. The rules are pinned by
  their own tests, and all five documents are asserted byte-identical to the golden files in
  `local/golden/`, which the Java renderer produced while both existed. A template change means
  deleting the golden, re-running the test and reading the diff as the document a user files.
- **Money is float here and BigDecimal there.** `formatMoney` rounds half-up through
  `toPrecision(15)` so two-decimal amounts and their sums match the backend exactly.
- **Browser storage is evictable, so the export file is the recovery story, not a nicety.**
  `/backup` writes one passphrase-encrypted `.restart` file (PBKDF2-SHA256 300k, AES-GCM, all in
  WebCrypto). The passphrase is unrecoverable and the app says so; the same page and the case
  creation and documents screens say plainly that clearing site data loses the case.
- **`pdf-lib` + the font are lazy-loaded** on the documents screen only (~1.1 MB / 506 kB gzip
  plus a 56 kB font). `pdf-lib` is the remaining weight; a smaller PDF writer is the next win.
- **The shipped font is subset to Latin + Cyrillic** (`FONT_RANGES` in the generator, 340 kB →
  56 kB). Characters outside those ranges are drawn as `?` — that is `sanitize()` in `pdf.ts`
  doing its job, and the fix for a real name that needs more is to widen the ranges and
  regenerate. `local/fontCoverage.test.ts` fails if any glyph the five documents use is missing.
  The backend still embeds the full font, so on the (unused) server path such a character would
  still render; harmless while nothing calls it, and it disappears with phase 4.
