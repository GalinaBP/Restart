-- Case-management module: the bankruptcy case container (backlog AI-001). One row per case;
-- collected data sections arrive with AI-002 in their own table(s). case_type exists from day one
-- so future case kinds (e.g. business bankruptcy) reuse the same model, per backlog dev notes.
CREATE TABLE bankruptcy_case
(
    id         BINARY(16)  NOT NULL,
    user_id    BINARY(16)  NOT NULL,
    case_type  VARCHAR(32) NOT NULL,
    status     VARCHAR(32) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_bankruptcy_case_user (user_id),
    CONSTRAINT fk_bankruptcy_case_user FOREIGN KEY (user_id) REFERENCES user_account (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
