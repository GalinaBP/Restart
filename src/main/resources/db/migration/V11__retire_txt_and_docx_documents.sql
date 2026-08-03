-- Documents are produced as PDF only. An editable copy invites hand-editing, and a document
-- edited outside the app silently stops matching the case data it was generated from; «Мой
-- арбитр», the online filing route, wants PDF anyway.
--
-- format is stored as the DocumentFormat enum name, so rows holding a format the enum no longer
-- knows fail to map on read and take down every screen that lists a case's documents. Same reason
-- and same remedy as V9 (document types) and V10 (sections); see the rule in CLAUDE.md.
--
-- Data note: nothing is lost — the PDF of every document stays, and all of them are rebuilt from
-- the case sections on the next save.
DELETE
FROM case_document
WHERE format IN ('TXT', 'DOCX');
