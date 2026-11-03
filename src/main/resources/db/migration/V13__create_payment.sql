-- Payment module: one row per YooKassa payment started by an account. Access to the journey is
-- granted while the account has a SUCCEEDED row. The provider id is unique so a webhook can find
-- its payment; the amount is kept to check what YooKassa reports against what was asked.
CREATE TABLE payment
(
    id                  BINARY(16)    NOT NULL,
    user_id             BINARY(16)    NOT NULL,
    provider_payment_id VARCHAR(64)   NOT NULL,
    amount              DECIMAL(19, 2) NOT NULL,
    currency            CHAR(3)       NOT NULL,
    status              VARCHAR(32)   NOT NULL,
    paid_at             DATETIME(6)   NULL,
    created_at          DATETIME(6)   NOT NULL,
    updated_at          DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_payment_provider_payment_id UNIQUE (provider_payment_id),
    KEY idx_payment_user_status (user_id, status),
    CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES user_account (id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
