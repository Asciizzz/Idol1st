USE idol1st;

-- =============================================================
--  LAYER 2 — IDENTITY
--  Everything that defines how the idol page looks and links out.
--  Every table below has tenant_id.
-- =============================================================

-- Core profile record. One per tenant.
-- Could add more fields for more profile customization
CREATE TABLE IF NOT EXISTS idol_profiles (
    id                       CHAR(36)     NOT NULL DEFAULT (UUID()),
    tenant_id                CHAR(36)     NOT NULL,

    -- Basic info
    name                     VARCHAR(150) NOT NULL,
    bio                      TEXT             NULL,

    -- Asset URLs (resolved from tenant_assets)
    avatar_url               VARCHAR(500)     NULL,
    banner_url               VARCHAR(500)     NULL,
    favicon_url              VARCHAR(500)     NULL,

    -- Background
    background_type          ENUM(
                               'none',
                               'color',
                               'image',
                               'pattern'
                             )            NOT NULL DEFAULT 'none',
    background_value         VARCHAR(500)     NULL, -- hex color OR image URL OR pattern key
    background_fit           ENUM(
                               'cover',
                               'contain',
                               'tile',
                               'center'
                             )            NOT NULL DEFAULT 'cover',

    -- Branding
    theme_color              CHAR(7)      NOT NULL DEFAULT '#C8102E', -- primary accent hex
    theme_color_secondary    CHAR(7)      NOT NULL DEFAULT '#FF8FAB', -- secondary accent hex
    font_choice              ENUM(
                               'elegant',
                               'clean',
                               'minimal',
                               'bold'
                             )            NOT NULL DEFAULT 'clean',
    icon_set                 ENUM(
                               'soft',
                               'filled',
                               'geometric',
                               'floral'
                             )            NOT NULL DEFAULT 'soft',

    created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                   ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_profile_tenant (tenant_id),         -- exactly one profile per tenant
    CONSTRAINT fk_profile_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
);

-- File upload history for each tenant.
-- Keeps old versions so tenants can revert assets.
CREATE TABLE IF NOT EXISTS tenant_assets (
    id           CHAR(36)     NOT NULL DEFAULT (UUID()),
    tenant_id    CHAR(36)     NOT NULL,
    type         ENUM(
                   'avatar',
                   'banner',
                   'background',
                   'favicon',
                   'product_image',
                   'fan_content',
                   'blog_image'
                 )            NOT NULL,
    file_path    VARCHAR(500) NOT NULL,  -- relative path in storage (never full URL)
    file_size    INT UNSIGNED NOT NULL DEFAULT 0, -- bytes
    mime_type    VARCHAR(100)     NULL,
    is_active    TINYINT(1)   NOT NULL DEFAULT 1,
    uploaded_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_asset_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
    INDEX idx_assets_tenant_type (tenant_id, type)
);

-- Social / streaming links shown on the idol's link hub.
CREATE TABLE IF NOT EXISTS platform_links (
    id             CHAR(36)     NOT NULL DEFAULT (UUID()),
    tenant_id      CHAR(36)     NOT NULL,
    platform       VARCHAR(80)  NOT NULL, -- e.g. 'youtube', 'twitter', 'instagram'
    url            VARCHAR(500) NOT NULL,
    preview_title  VARCHAR(255)     NULL, -- fetched from URL metadata
    preview_image  VARCHAR(500)     NULL,
    sort_order     SMALLINT     NOT NULL DEFAULT 0,
    is_active      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                         ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_link_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
    INDEX idx_links_tenant (tenant_id, sort_order)
);