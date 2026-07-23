-- Guided journey through the court procedure (backlog AI-018): where the case has got to in each
-- stage. One row per (case, stage), created lazily — a stage with no row has simply not been
-- started. Derived stages (screening, document preparation) never get a row: their status is read
-- off the case data itself, so a hand-recorded status could contradict what the case shows.
CREATE TABLE case_journey_stage
(
    id           BINARY(16)  NOT NULL,
    case_id      BINARY(16)  NOT NULL,
    stage        VARCHAR(64) NOT NULL,
    status       VARCHAR(32) NOT NULL,
    started_on   DATE        NULL,
    completed_on DATE        NULL,
    note         VARCHAR(2000) NULL,
    created_at   DATETIME(6) NOT NULL,
    updated_at   DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_case_journey_stage UNIQUE (case_id, stage),
    CONSTRAINT fk_case_journey_stage_case FOREIGN KEY (case_id) REFERENCES bankruptcy_case (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- Which procedure the court applied (реструктуризация / реализация / мировое соглашение).
-- NULL until the court decides: the app never predicts the outcome, and while it is NULL the
-- journey shows only the common path.
ALTER TABLE bankruptcy_case
    ADD COLUMN procedure_type VARCHAR(32) NULL;
