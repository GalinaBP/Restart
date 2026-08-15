# Golden files — the frozen output of the filing documents

One file per document, rendered from `sampleModel.ts`, pinned byte-for-byte by
`mustache.test.ts`. A diff here means the wording of a document changed: read it as the document,
not as a test fixture, because that is what a user files with the court.

These were produced by the **Java** renderer (jmustache + PDFBox) and used to be checked from both
sides — `src/test/resources/doctemplate/golden/`, asserted by `GoldenFileRegressionTest` in Java
and by `mustache.test.ts` in the browser. That cross-check is what proved the two renderers agreed
when the engine moved into the browser in August 2026.

Since the Java renderer was deleted (phase 4 of `docs/local-first-plan.md`) there is only one
implementation left, so these stopped being a cross-check and became what they now are: the frozen
wording, still carrying the byte-for-byte agreement that was established while both existed.

**Changing a template means changing these.** Delete the file for the document you changed, re-run
the test to regenerate it, then read the diff — `git diff` on these files is the review.
