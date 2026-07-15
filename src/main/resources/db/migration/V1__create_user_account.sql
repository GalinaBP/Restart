-- Auth module: user accounts. UUIDs are stored as BINARY(16) (see common.persistence.UuidUtils),
-- timestamps are UTC instants (DATETIME(6)), per platform conventions.
CREATE TABLE user_account
(
    id            BINARY(16)   NOT NULL,
    email         VARCHAR(320) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role          VARCHAR(32)  NOT NULL,
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_user_account_email UNIQUE (email)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
