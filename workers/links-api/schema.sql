-- Toolproof Link Builder — D1 schema
-- Apply: npx wrangler d1 execute links-db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS workspaces (
    id          TEXT PRIMARY KEY,           -- short public id, e.g. "k3x9q2"
    name        TEXT NOT NULL,              -- client business name
    domains     TEXT NOT NULL DEFAULT '',   -- comma-separated, e.g. "example.com.au"
    key_hash    TEXT NOT NULL,              -- SHA-256 of the workspace secret
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS campaigns (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,            -- cleaned utm_campaign value
    starts_on     TEXT,
    ends_on       TEXT,
    notes         TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS sources (
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    value         TEXT NOT NULL,            -- client-specific utm_source, cleaned
    PRIMARY KEY (workspace_id, value)
);

CREATE TABLE IF NOT EXISTS links (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    base_url      TEXT NOT NULL,
    source        TEXT NOT NULL,
    medium        TEXT NOT NULL,
    campaign      TEXT NOT NULL,
    term          TEXT NOT NULL DEFAULT '',
    content       TEXT NOT NULL DEFAULT '',
    final_url     TEXT NOT NULL,
    short_code    TEXT UNIQUE,
    notes         TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS links_workspace ON links (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS clicks (
    short_code  TEXT NOT NULL,
    clicked_at  TEXT NOT NULL DEFAULT (datetime('now')),
    referrer    TEXT NOT NULL DEFAULT '',
    country     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS clicks_code ON clicks (short_code);

-- Custom short-link names (e.g. taggd.au/spring-sale), shared across all clients.
-- A link keeps every name it has had, so renaming never breaks a printed link;
-- the newest (highest rowid) is shown. Clicks are recorded against the link's short_code.
CREATE TABLE IF NOT EXISTS short_aliases (
    alias         TEXT PRIMARY KEY,         -- lowercase, a-z 0-9 and hyphens, 3–40 chars
    link_id       INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS short_aliases_link ON short_aliases (link_id);
