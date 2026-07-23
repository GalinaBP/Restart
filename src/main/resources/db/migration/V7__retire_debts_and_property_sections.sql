-- Journey rework: DEBTS merged into CREDITORS (which now also carries overdueSinceDate) and
-- PROPERTY dropped entirely. section_key is stored as the SectionKey enum name, so rows holding a
-- key the enum no longer knows would fail to map on read — they are removed here.
--
-- Data note: CREDITORS already carried who is owed and how much, so the merge loses nothing on
-- that side; what goes is the DEBTS overdue dates and the free-form PROPERTY list. Generated
-- documents are rebuilt from the sections on the next save, so no document cleanup is needed.
DELETE
FROM case_section
WHERE section_key IN ('DEBTS', 'PROPERTY');
