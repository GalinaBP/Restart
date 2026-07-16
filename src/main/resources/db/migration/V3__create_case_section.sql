-- Data-collection workflow (backlog AI-002): one row per (case, section), payload is the section's
-- collected data as JSON — an object for regular sections, an array of entry objects for
-- repeatable ones (creditors, vehicles, …). The set of sections and their fields is defined in
-- casefile/sections.yml, not in the schema, so legislative changes don't require migrations.
CREATE TABLE case_section
(
    id          BINARY(16)  NOT NULL,
    case_id     BINARY(16)  NOT NULL,
    section_key VARCHAR(64) NOT NULL,
    payload     JSON        NOT NULL,
    created_at  DATETIME(6) NOT NULL,
    updated_at  DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_case_section UNIQUE (case_id, section_key),
    CONSTRAINT fk_case_section_case FOREIGN KEY (case_id) REFERENCES bankruptcy_case (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
