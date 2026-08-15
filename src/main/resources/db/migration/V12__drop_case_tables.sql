-- The case moved to the user's browser (docs/local-first-plan.md, phase 4). Everything the debtor
-- typed about their bankruptcy — passport, address, creditors, income, the generated filings —
-- lived in these four tables; the promise «мы не передаём такие данные стороннему сервису» is only
-- structurally true once they are gone, not merely unused.
--
-- ##############################################################################################
-- ##  THIS DESTROYS DATA AND CANNOT BE UNDONE.                                                ##
-- ##  Any case still held here is deleted. Users who opened the app after the local-first      ##
-- ##  release had their case pulled into the browser once and are unaffected; anyone who       ##
-- ##  never came back loses what they had entered. Take a database snapshot before deploying.  ##
-- ##############################################################################################
--
-- Dropped children first: case_document, case_section and case_journey_stage each carry a foreign
-- key to bankruptcy_case, which in turn references user_account.
--
-- user_account and password_reset_token stay. The account survives as the way in (see the answer
-- to §9.2 of the plan); it just no longer has a case hanging off it.
DROP TABLE IF EXISTS case_document;

DROP TABLE IF EXISTS case_section;

DROP TABLE IF EXISTS case_journey_stage;

DROP TABLE IF EXISTS bankruptcy_case;
