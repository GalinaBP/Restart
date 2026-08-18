# Generated — do not edit by hand

Every file here except this README is produced by `npm run rules` from `rules/`:

| File | Generated from |
|------|----------------|
| `sections.json` | `rules/sections.yml` |
| `journey.json` | `rules/journey.yml` |
| `fees.json` | `rules/fees.yml` |
| `courts.json` | `rules/courts.yml` |
| `claim-deadline.json` | `rules/claim-deadline.yml` |
| `templates.json` | `rules/doctemplates/manifest.yml` + the active version's `*.mustache` |
| `DejaVuSansMono.ttf` | `rules/fonts/DejaVuSansMono.ttf`, subset to Latin + Cyrillic |

The rules stay authored in YAML, in one place, with their
placeholder-pending-lawyer-review markers intact — this is a build product of those files, not a
second copy to maintain. A legislative amendment is still an edit to the YAML (or a new template
version directory) followed by `npm run rules`.

**Why it is committed rather than generated at build time:** `frontend/Dockerfile` copies only
`frontend/`, so nothing under `rules/` exists when the image is built. CI runs
`npm run rules:check`, which regenerates and fails on any diff, so a YAML edit that never made it
through the generator cannot reach main.

The generator also cross-checks the keys against the Java enums (`SectionKey`, `JourneyStage`,
`FeeItem`) and refuses to write anything if they have drifted apart.

The font is cut down to the ranges listed in `FONT_RANGES` (ASCII, Latin-1, Latin Extended-A,
Cyrillic and its supplement, general punctuation, currency, №) — 340 kB down to 56 kB. Anything
outside those ranges is drawn as `?`, so widening the ranges is the fix if a real name ever needs
it; `local/fontCoverage.test.ts` is what proves the documents still have every glyph they use.
