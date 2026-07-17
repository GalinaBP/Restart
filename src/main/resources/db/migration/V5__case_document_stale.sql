-- Regeneration on edit (backlog AI-008): when a data edit leaves the case invalid, existing
-- documents cannot be regenerated (the AI-007 gate) — they are flagged stale instead, so an
-- outdated file is always visibly superseded, never silently current.
ALTER TABLE case_document
    ADD COLUMN stale TINYINT(1) NOT NULL DEFAULT 0;
