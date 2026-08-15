# Generated — do not edit by hand

Everything in this directory is produced by `npm run rules` from the backend's own sources:

| File | Generated from |
|------|----------------|
| `sections.json` | `src/main/resources/casefile/sections.yml` |
| `journey.json` | `src/main/resources/casefile/journey.yml` |
| `fees.json` | `src/main/resources/casefile/fees.yml` |
| `courts.json` | `src/main/resources/casefile/courts.yml` |
| `claim-deadline.json` | `src/main/resources/casefile/claim-deadline.yml` |
| `templates.json` | `src/main/resources/doctemplates/manifest.yml` + the active version's `*.mustache` |
| `DejaVuSansMono.ttf` | `src/main/resources/fonts/DejaVuSansMono.ttf` |

The rules stay authored in YAML, in one place, with their
placeholder-pending-lawyer-review markers intact — this is a build product of those files, not a
second copy to maintain. A legislative amendment is still an edit to the YAML (or a new template
version directory) followed by `npm run rules`.

**Why it is committed rather than generated at build time:** `frontend/Dockerfile` copies only
`frontend/`, so nothing under `src/main/resources` exists when the image is built. CI runs
`npm run rules:check`, which regenerates and fails on any diff, so a YAML edit that never made it
through the generator cannot reach main.

The generator also cross-checks the keys against the Java enums (`SectionKey`, `JourneyStage`,
`FeeItem`) and refuses to write anything if they have drifted apart.
