USE idol1st;

-- =============================================================
--  LAYER 1 — PLATFORM
--  No tenant_id here. These tables are global to the whole SaaS.
-- =============================================================

-- Every idol page / agency on the platform is one tenant.
CREATE TABLE IF NOT EXISTS tenants (
    id            CHAR(36)        NOT NULL DEFAULT (UUID()),
    slug          VARCHAR(80)     NOT NULL,           -- e.g. "hatsunemiku" → hatsunemiku.idol1st.app
    name          VARCHAR(150)    NOT NULL,
    status        ENUM(
                    'active',
                    'inactive',
                    'suspended'
                  )               NOT NULL DEFAULT 'active',
    storage_used  BIGINT UNSIGNED NOT NULL DEFAULT 0, -- bytes used by this tenant
    storage_quota BIGINT UNSIGNED NOT NULL DEFAULT 52428800, -- default 50 MB
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_tenants_slug (slug)
);

-- All fan accounts. One user can follow / interact with many tenants.
-- Fan account here is created for the entire SaaS, no matter the slug (works for any .idol1st.app)
CREATE TABLE IF NOT EXISTS users (
    id            CHAR(36)     NOT NULL DEFAULT (UUID()),
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(150) NOT NULL,
    avatar_url    VARCHAR(500)     NULL,
    is_verified   TINYINT(1)   NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
);

-- Junction table: which users belong to which tenant, and in what role.
-- Same user can be a fan on one tenant and a moderator on another.
CREATE TABLE IF NOT EXISTS tenant_users (
    id          CHAR(36)  NOT NULL DEFAULT (UUID()),
    tenant_id   CHAR(36)  NOT NULL,
    user_id     CHAR(36)  NOT NULL,
    role        ENUM(
                  'tenant_admin',  -- full control of this tenant
                  'moderator',     -- can approve content / comments
                  'fan'            -- registered fan
                )         NOT NULL DEFAULT 'fan',
    joined_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_tenant_users (tenant_id, user_id),   -- one row per user per tenant
    CONSTRAINT fk_tu_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
    CONSTRAINT fk_tu_user   FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE
);