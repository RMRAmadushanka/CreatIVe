CREATE TABLE users (
    id         VARCHAR(36) PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    name       VARCHAR(255) NOT NULL,
    role       VARCHAR(20)  NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'USER'))
);

ALTER TABLE pages
    ADD COLUMN owner_id VARCHAR(36) REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX idx_pages_owner_id ON pages (owner_id);
