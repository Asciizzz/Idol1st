USE idol1st;

-- =============================================================
--  USEFUL VIEWS
-- =============================================================

-- Quick summary of each tenant for the Platform Admin dashboard.
CREATE OR REPLACE VIEW v_tenant_summary AS
SELECT
    t.id,
    t.slug,
    t.name,
    t.status,
    t.storage_used,
    t.storage_quota,
    ip.avatar_url,
    ip.theme_color,
    ps.is_public,
    ps.module_merch,
    (SELECT COUNT(*) FROM tenant_users tu WHERE tu.tenant_id = t.id AND tu.role = 'fan')         AS fan_count,
    (SELECT COUNT(*) FROM blog_posts   bp WHERE bp.tenant_id = t.id AND bp.status = 'published') AS post_count,
    (SELECT COUNT(*) FROM products     p  WHERE p.tenant_id  = t.id AND p.status  = 'active')    AS active_products,
    (SELECT COUNT(*) FROM orders       o  WHERE o.tenant_id  = t.id)                             AS total_orders,
    t.created_at
FROM tenants t
LEFT JOIN idol_profiles ip ON ip.tenant_id = t.id
LEFT JOIN page_settings ps ON ps.tenant_id = t.id;

-- Pending moderation queue per tenant (comments + fan content combined).
CREATE OR REPLACE VIEW v_pending_moderation AS
SELECT
    tenant_id,
    'comment'     AS content_type,
    id,
    created_at
FROM comments
WHERE status = 'pending'
UNION ALL
SELECT
    tenant_id,
    'fan_content' AS content_type,
    id,
    created_at
FROM fan_contents
WHERE status = 'pending'
ORDER BY created_at ASC;