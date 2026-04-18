USE idol1st;

-- =============================================================
--  LAYER 2B — CREATOR BUILDER (PROPOSED)
--  Structured storage for visual builder pages and blocks.
-- =============================================================

CREATE TABLE IF NOT EXISTS site_templates (
    id               CHAR(36)     NOT NULL DEFAULT (UUID()),
    template_key     VARCHAR(80)  NOT NULL,
    display_name     VARCHAR(150) NOT NULL,
    site_type_scope  ENUM('idol', 'agency', 'both') NOT NULL DEFAULT 'both',
    defaults_json    JSON         NOT NULL,
    is_active        TINYINT(1)   NOT NULL DEFAULT 1,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_site_templates_key (template_key)
);

CREATE TABLE IF NOT EXISTS site_pages (
    id           CHAR(36)     NOT NULL DEFAULT (UUID()),
    tenant_id    CHAR(36)     NOT NULL,
    slug         VARCHAR(120) NOT NULL,
    title        VARCHAR(160) NOT NULL,
    is_home      TINYINT(1)   NOT NULL DEFAULT 0,
    visibility   ENUM('public', 'members_only', 'private') NOT NULL DEFAULT 'public',
    sort_order   INT UNSIGNED NOT NULL DEFAULT 0,
    is_active    TINYINT(1)   NOT NULL DEFAULT 1,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_site_pages_tenant_slug (tenant_id, slug),
    INDEX idx_site_pages_tenant_order (tenant_id, sort_order),
    CONSTRAINT fk_site_pages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS site_blocks (
    id               CHAR(36)     NOT NULL DEFAULT (UUID()),
    tenant_id        CHAR(36)     NOT NULL,
    page_id          CHAR(36)     NOT NULL,
    block_type       VARCHAR(80)  NOT NULL,
    block_data_json  JSON         NOT NULL,
    sort_order       INT UNSIGNED NOT NULL DEFAULT 0,
    is_active        TINYINT(1)   NOT NULL DEFAULT 1,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_site_blocks_page_order (page_id, sort_order),
    INDEX idx_site_blocks_tenant (tenant_id),
    CONSTRAINT fk_site_blocks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
    CONSTRAINT fk_site_blocks_page FOREIGN KEY (page_id) REFERENCES site_pages (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS site_drafts (
    id              CHAR(36)     NOT NULL DEFAULT (UUID()),
    tenant_id       CHAR(36)     NOT NULL,
    editor_user_id  CHAR(36)     NOT NULL,
    payload_json    JSON         NOT NULL,
    status          ENUM('draft', 'published_snapshot') NOT NULL DEFAULT 'draft',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_site_drafts_tenant_created (tenant_id, created_at),
    CONSTRAINT fk_site_drafts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
    CONSTRAINT fk_site_drafts_editor FOREIGN KEY (editor_user_id) REFERENCES users (id) ON DELETE CASCADE
);
