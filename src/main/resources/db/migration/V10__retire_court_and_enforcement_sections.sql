-- «Суды» and «Приставы» are dropped from the questionnaire. Anyone who has a pending lawsuit or
-- an active bailiff enforcement is now routed to a lawyer by the screening itself, so these two
-- optional sections could only ever be filled by users the product has already declined to serve
-- on its own — and since the case screen was reorganised into three parts they had no entry point
-- at all.
--
-- section_key is stored as the SectionKey enum name, so rows holding a key the enum no longer
-- knows fail to map on read and take down every screen that reads the case's sections. Same
-- reason and same remedy as V7 and V9; see the rule in CLAUDE.md.
--
-- Data note: neither section fed any document template, so nothing generated changes.
DELETE
FROM case_section
WHERE section_key IN ('COURT_PROCEEDINGS', 'ENFORCEMENT_PROCEEDINGS');
