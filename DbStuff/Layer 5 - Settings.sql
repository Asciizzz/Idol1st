USE idol1st;

-- =============================================================
--  LAYER 5 — SETTINGS
--  Per-tenant feature flags and moderation defaults.
--  One row per tenant, created automatically on tenant registration.
-- =============================================================

CREATE TABLE IF NOT EXISTS page_settings (
    id                       CHAR(36)   NOT NULL DEFAULT (UUID()),
    tenant_id                CHAR(36)   NOT NULL,

    -- Visibility
    is_public                TINYINT(1) NOT NULL DEFAULT 0,  -- page live to the world?
    allow_guest_access       TINYINT(1) NOT NULL DEFAULT 1,  -- can unregistered users browse?
    fan_registration_open    TINYINT(1) NOT NULL DEFAULT 1,  -- can new fans sign up?

    -- Module toggles
    module_blog              TINYINT(1) NOT NULL DEFAULT 1,
    module_fan_content       TINYINT(1) NOT NULL DEFAULT 1,
    module_merch             TINYINT(1) NOT NULL DEFAULT 0,  -- off by default
    module_comments          TINYINT(1) NOT NULL DEFAULT 1,
    module_members_only      TINYINT(1) NOT NULL DEFAULT 0,  -- off by default

    -- Moderation defaults
    auto_approve_comments    TINYINT(1) NOT NULL DEFAULT 0,  -- require review
    auto_approve_fan_content TINYINT(1) NOT NULL DEFAULT 0,  -- require review
    require_login_to_comment TINYINT(1) NOT NULL DEFAULT 1,

    created_at               DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                  ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_settings_tenant (tenant_id),    -- exactly one settings row per tenant
    CONSTRAINT fk_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
);