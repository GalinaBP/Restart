-- Document generation (backlog AI-006): the generated filing documents of a case, one row per
-- (case, document type, format). Regeneration replaces content in place — the unique key makes
-- "superseded, never duplicated" a database guarantee (AI-008 builds on this).
CREATE TABLE case_document
(
    id               BINARY(16)   NOT NULL,
    case_id          BINARY(16)   NOT NULL,
    document_type    VARCHAR(64)  NOT NULL,
    format           VARCHAR(16)  NOT NULL,
    template_version VARCHAR(32)  NOT NULL,
    content          MEDIUMBLOB   NOT NULL,
    created_at       DATETIME(6)  NOT NULL,
    updated_at       DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_case_document UNIQUE (case_id, document_type, format),
    CONSTRAINT fk_case_document_case FOREIGN KEY (case_id) REFERENCES bankruptcy_case (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
