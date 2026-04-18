# Idol1st Database Files: Summary

## One-Paragraph Summary
The DbStuff SQL files implement a layered, multi-tenant schema for Idol1st: platform-level tenancy and users, tenant identity/branding, content and moderation, commerce and orders, tenant feature settings, plus convenience views for admin dashboards and moderation queues.

## Quick Purpose by File
- Schema Overview.sql: creates the idol1st database with Unicode-safe collation.
- Layer 1 - Platform.sql: defines tenants, users, and tenant membership/roles.
- Layer 2 - Identity.sql: defines idol profile customization, assets, and social links.
- Layer 3 - Content.sql: defines posts, comments, fan submissions, and moderation states.
- Layer 4 - Commerce.sql: defines products, orders, and order item snapshots.
- Layer 5 - Settings.sql: defines per-tenant feature flags and moderation defaults.
- Useful Views.sql: defines admin-ready summary and moderation queue views.
- Idol1st - EER Diagram (1st Draft).mwb: visual ER model of tables/relationships.

## Key Intent
1. Support many tenants in one SaaS database.
2. Keep tenant-specific data scoped with tenant_id.
3. Separate concerns by layer for easier maintenance.
4. Provide moderation- and dashboard-friendly read models.

## Fixes Applied
- Improved rerun safety with IF NOT EXISTS for tables.
- Improved view creation safety with DROP VIEW IF EXISTS + CREATE VIEW.
- Added data-integrity checks in commerce (stock and quantity constraints).
- Added missing created_at audit field in settings.
- Added indexes on order_items foreign key columns.
