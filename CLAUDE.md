# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Restart** (`ru.restart`) — a consumer app that guides a user through the Russian personal
bankruptcy procedure step by step, as a journey rather than bureaucracy. The product vision lives in
`../constitution.docx` (kept next to the repo, not inside it); its non-negotiables:

- Plain language everywhere — **no legal terminology in anything user-facing** (UI copy, error
  messages). Tone: "Сейчас нужно получить выписку", never "В соответствии с ФЗ…".
- One action per screen; only the next step is shown.
- Narrow ICP: 20–35, unmarried, no car/real estate/business, consumer debts 500k–3M ₽. Complex cases
  (assets, deals, divorce, business) must be detected early and routed to a lawyer — honestly.
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
```

Colima note: Docker Engine 29's socket must be pointed to explicitly for Testcontainers — same
workaround as documented in the Adiaphora repo (`~/.testcontainers.properties` /
`-DargLine="-Dapi.version=1.44"`).

Swagger UI (`local` profile only, disabled in `prod`): http://localhost:8080/swagger-ui.html

## Architecture

One Spring Boot 4.1 / Java 21 **modular monolith**, one MySQL schema, one deployable artifact.
Feature modules live under `ru.restart.app`; `common` holds shared technical building blocks.
Business modules so far: `eligibility` (the 2-minute screening check — stateless, anonymous,
placeholder rules pending lawyer review), `auth` (accounts + stateless JWT: register/login/
refresh/me; contributes its token filter via `HttpSecurityCustomizer`; local demo account seeded
when `restart.seed.enabled=true`) and `casefile` (the bankruptcy case container: one active case
per user, draft → in_progress → ready → filed; ownership enforced at the service layer, foreign
cases answered as 404; step-by-step data collection and the deterministic validation engine are
both driven by `casefile/sections.yml` — field types, required flags, mandatory sections,
duplicate rules, and the field ↔ 127-ФЗ mapping, placeholder pending lawyer review. Validation
never blocks saving; `GET /cases/{id}/validation` is the report the generation gate consumes;
document generation `POST /cases/{id}/documents` renders all six filing documents in txt + docx
+ pdf — minimal hand-built OOXML; PDF via PDFBox with the embedded DejaVu font for Cyrillic — hard-gated 409 GENERATION_BLOCKED with the missing-item
list; once documents exist, every section save regenerates all of them while the case stays
valid, or flags them `stale` when it doesn't — full regeneration by design, documents are never
silently outdated; `POST /cases/{id}/documents/export` regenerates and bundles everything into
one zip behind the same gate; the **journey through the court procedure** is driven by
`casefile/journey.yml` the same way — stages, their order, which procedure branch each belongs to
and its 127-ФЗ reference, placeholder pending lawyer review. Two kinds of stage: *derived* ones
(screening, document preparation) compute their status from the case data and refuse to be
recorded by hand (409), so the map can never contradict the case; the rest the user records
(status, dates, note) through `PUT /cases/{id}/journey/{stage}`. `GET /cases/{id}/journey` returns
the stages that apply plus the current one, and `PUT /cases/{id}/journey/procedure-type` records
the court's choice — restructuring / realization / settlement — revealing that branch only)
and `doctemplate` (versioned Mustache templates for the six filing documents under
`resources/doctemplates/<version>/`, shared legal boilerplate as partials, edition picked by
`doctemplates/manifest.yml` — a legislative amendment is a new version directory + manifest bump,
no code changes; every output carries a "ШАБЛОН-ПЛЕЙСХОЛДЕР" banner until lawyer sign-off;
golden-file regression tests pin each document's output).

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

**Database:** Flyway owns the schema (`src/main/resources/db/migration`, currently empty); Hibernate
runs `ddl-auto: validate`. Add a migration in the same change as any new entity. UUIDs as
`BINARY(16)` (`UuidUtils`), money as `DECIMAL(19,2)`, timestamps UTC.

**API conventions:** base path `/api/v1` (`ApiPaths`), JSON/camelCase, separate request/response
DTOs, Bean Validation on request bodies, `PageResponse` envelope for collections, OpenAPI on every
endpoint.

**Profiles:** no default profile — `local` (dev, Swagger on) or `prod` (everything from env, fails
fast) must be chosen explicitly; `test` is used by integration tests via Testcontainers.

## Frontend

`frontend/` — React 19 + TypeScript + Vite SPA, served by nginx in Docker (static + SPA fallback,
no API proxy; the API base URL is baked in via the `VITE_API_BASE` build arg). UI shell only — all
legal/eligibility logic belongs to the backend. Copy style: warm, short, **formal second-person
plural ("Вы")**, zero legalese. (This reverses the constitution's original informal "ты" — a
product decision recorded in `../Corrections.xlsx`, 2026-07-21; the constitution.docx still says
"ты" and should be updated to match.) Use lowercase «вы/вас/ваш» mid-sentence, capital only at the
start of a sentence. Visual style: a dark **"space" theme** — deep canvas (`--bg #0b0b12`), a
**solid green accent** (`#34d399`, no gradients) on buttons and text, soft green glows behind the
landing, big friendly type, pill shapes; calm, never loud (the subject matter is heavy). Green
buttons use dark ink text (`#04231a`) for contrast. Emoji: the landing keeps the single rocket
🚀, and the **screening questions and their options carry emoji** (2026-07-22 decision); the rest
of the app (wizard labels, journey, documents) stays emoji-free. Design tokens live in
`frontend/src/styles.css` `:root`. (Earlier AI-011 experiments with an Adiaphora slate/green, a
light marketing landing, and a blue→cyan gradient were reverted.)
