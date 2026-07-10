CREATE TABLE projects (
    id         UUID PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    domain     VARCHAR(255) NOT NULL,
    owner_id   VARCHAR(36)  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_owner_id ON projects (owner_id);

CREATE TABLE project_pages (
    id           UUID PRIMARY KEY,
    project_id   UUID         NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    slug         VARCHAR(255) NOT NULL,
    canvas_nodes JSONB,
    sort_order   INT          NOT NULL DEFAULT 0,
    created_at   TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT uq_project_pages_slug UNIQUE (project_id, slug)
);

CREATE INDEX idx_project_pages_project_id ON project_pages (project_id);
