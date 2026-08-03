-- Document package trimmed: DEBT_SUMMARY and PAYMENT_INSTRUCTIONS dropped (the first duplicated
-- the creditor list, the second was a memo that is never filed), and SRO_NOMINATION folded into
-- point 3 of the application itself.
--
-- document_type is stored as the DocumentType enum name, so rows holding a type the enum no
-- longer knows fail to map on read — and every screen that lists documents or derives a stage
-- from them (Документы, Весь путь) breaks for any case that had generated them. Same reason and
-- same remedy as V7.
--
-- Data note: nothing is lost. Documents are rebuilt from the case sections on the next save, and
-- these three are simply no longer part of the package.
DELETE
FROM case_document
WHERE document_type IN ('DEBT_SUMMARY', 'PAYMENT_INSTRUCTIONS', 'SRO_NOMINATION');
