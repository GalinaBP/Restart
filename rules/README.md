# rules/ — what the app knows about bankruptcy

Everything in here is **content, not code**: the questionnaire, the stages of the court procedure,
what a filing costs, which court hears the case, and the text of the documents themselves. It is
deliberately editable without touching a line of Java or TypeScript — a legislative amendment, a
corrected fee or a lawyer's rewording is a change to these files plus `npm run rules`.

| File | What it decides |
|------|-----------------|
| `sections.yml` | The questionnaire: which sections exist, their order, their fields and types, what is required, what counts as a duplicate, and each field's 127-ФЗ basis |
| `journey.yml` | The court procedure as stages: order, which branch each belongs to, which are derived from the case rather than recorded by hand |
| `fees.yml` | What the filing costs — the state duty and the manager's deposit |
| `courts.yml` | Region → arbitration court, matched on the debtor's registration address |
| `claim-deadline.yml` | How long creditors have to file claims, counted from the ЕФРСБ publication |
| `doctemplates/manifest.yml` | Which template edition is in force and which five documents make up the filing package |
| `doctemplates/<version>/` | The documents themselves, as Mustache templates, with shared legal boilerplate as partials |
| `fonts/` | DejaVu Sans Mono and its licence — the typeface the PDFs are set in |

**Everything here is a placeholder pending lawyer review.** The markers are in the files; see
`docs/lawyer-review.md` for the open questions. `fees.yml` and `claim-deadline.yml` are the two
where a wrong value costs the user real money or a missed deadline, which is why both carry a
`confirmed: false` flag that the UI surfaces as «черновик».

## How this reaches the user

Nothing on the server reads these files. `frontend/scripts/generate-rules.mjs` compiles them into
`frontend/src/generated/`, which the SPA ships; that generator is also the only thing validating
them, so it rejects an unknown field type, a duplicate key, a `uniqueBy` pointing at a field that
does not exist, a fee amount written without quotes (YAML would read `300.00` as a float), or a
template pulling in a partial the manifest does not list. CI runs `npm run rules:check`, which
regenerates and fails on any difference — so an edit here that never went through the generator
cannot reach main.

They used to live under `src/main/resources/`, read by the Java `casefile` and `doctemplate`
modules. Those modules were deleted when the case moved into the browser
(`docs/local-first-plan.md`, phase 4), and the files moved here so their location says what they
are: product content, not backend resources.

**Keys are permanent.** Section keys index the answers saved in a user's browser and document types
name the files stored beside them, so renaming one leaves an existing case pointing at rules that
no longer describe it. There is no migration to write on someone else's device — add freely, rename
never.
