-- Password reset: single-use, time-limited tokens. Only the SHA-256 of the token is stored —
-- a database leak must not hand out working reset links. A new request invalidates the user's
-- previous tokens (deleted by the service), so at most one row per user is usable at a time.
CREATE TABLE password_reset_token
(
    id         BINARY(16)  NOT NULL,
    user_id    BINARY(16)  NOT NULL,
    token_hash CHAR(64)    NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    used_at    DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_password_reset_token_hash UNIQUE (token_hash),
    KEY idx_password_reset_token_user (user_id),
    CONSTRAINT fk_password_reset_token_user FOREIGN KEY (user_id) REFERENCES user_account (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
