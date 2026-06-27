CREATE TABLE pages (
    id          UUID PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    layout_data JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);
