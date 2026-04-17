-- =============================================================
--  Idol1st SaaS — Full MySQL Schema
--
--  Layers:
--    1. Platform   — tenants, users, tenant_users
--    2. Identity   — idol_profiles, tenant_assets, platform_links
--    3. Content    — blog_posts, comments, fan_contents
--    4. Commerce   — products, orders, order_items
--    5. Settings   — page_settings (per-tenant config flags)
-- =============================================================

CREATE DATABASE IF NOT EXISTS idol1st
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;