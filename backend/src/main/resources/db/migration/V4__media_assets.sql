CREATE TABLE media_assets (
    id           UUID PRIMARY KEY,
    owner_id     VARCHAR(36)  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    url          TEXT         NOT NULL,
    storage_path VARCHAR(512),
    kind         VARCHAR(20)  NOT NULL,
    format       VARCHAR(20)  NOT NULL,
    width        INT          NOT NULL DEFAULT 0,
    height       INT          NOT NULL DEFAULT 0,
    size_bytes   BIGINT       NOT NULL DEFAULT 0,
    created_at   TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT media_assets_kind_check CHECK (kind IN ('logo', 'icon', 'image'))
);

CREATE INDEX idx_media_assets_owner_id ON media_assets (owner_id);
CREATE INDEX idx_media_assets_created_at ON media_assets (created_at DESC);
