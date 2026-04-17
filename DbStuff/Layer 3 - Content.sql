USE idol1st;

-- =============================================================
--  LAYER 3 — CONTENT
--  Blog posts, comments, fan uploads — all scoped to a tenant.
-- =============================================================

CREATE TABLE blog_posts (
    id            CHAR(36)     NOT NULL DEFAULT (UUID()),
    tenant_id     CHAR(36)     NOT NULL,
    author_id     CHAR(36)     NOT NULL,  -- FK to users (must be tenant_admin or moderator)
    title         VARCHAR(255) NOT NULL,
    slug          VARCHAR(255) NOT NULL,  -- URL-friendly title, unique per tenant
    body          LONGTEXT     NOT NULL,
    cover_url     VARCHAR(500)     NULL,  -- optional header image
    status        ENUM(
                    'draft',
                    'published',
                    'members_only'  -- visible only to registered fans
                  )            NOT NULL DEFAULT 'draft',
    published_at  DATETIME         NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_post_slug (tenant_id, slug),     -- slug unique within a tenant
    CONSTRAINT fk_post_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_author FOREIGN KEY (author_id) REFERENCES users   (id),
    INDEX idx_posts_tenant_status (tenant_id, status, published_at)
);

CREATE TABLE comments (
    id          CHAR(36)  NOT NULL DEFAULT (UUID()),
    tenant_id   CHAR(36)  NOT NULL,
    post_id     CHAR(36)  NOT NULL,
    user_id     CHAR(36)  NOT NULL,
    content     TEXT      NOT NULL,
    status      ENUM(
                  'pending',   -- waiting for moderator review
                  'approved',  -- visible to everyone
                  'hidden',    -- hidden by moderator, not deleted
                  'spam'       -- flagged as spam
                )         NOT NULL DEFAULT 'pending',
    created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_comment_tenant FOREIGN KEY (tenant_id) REFERENCES tenants    (id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_post   FOREIGN KEY (post_id)   REFERENCES blog_posts  (id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_user   FOREIGN KEY (user_id)   REFERENCES users       (id),
    INDEX idx_comments_post   (post_id, status),
    INDEX idx_comments_tenant (tenant_id, status)
);

CREATE TABLE fan_contents (
    id           CHAR(36)     NOT NULL DEFAULT (UUID()),
    tenant_id    CHAR(36)     NOT NULL,
    user_id      CHAR(36)     NOT NULL,
    asset_id     CHAR(36)         NULL,  -- FK to tenant_assets once uploaded
    title        VARCHAR(255)     NULL,
    media_url    VARCHAR(500)     NULL,  -- url leading to fan content piece (eg, images, video,...)
    description  TEXT             NULL,
    status       ENUM(
                   'pending',   -- awaiting moderator approval
                   'approved',  -- visible in gallery
                   'rejected'   -- rejected, not shown
                 )            NOT NULL DEFAULT 'pending',
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_fancontent_tenant FOREIGN KEY (tenant_id) REFERENCES tenants       (id) ON DELETE CASCADE,
    CONSTRAINT fk_fancontent_user   FOREIGN KEY (user_id)   REFERENCES users          (id),
    CONSTRAINT fk_fancontent_asset  FOREIGN KEY (asset_id)  REFERENCES tenant_assets  (id) ON DELETE SET NULL,
    INDEX idx_fancontent_tenant_status (tenant_id, status)
);