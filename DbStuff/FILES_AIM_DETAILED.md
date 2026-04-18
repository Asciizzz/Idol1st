# Idol1st Database Files: Detailed Intent

## Overall Goal
These SQL files define a layered, multi-tenant MySQL schema for Idol1st. The core intent is to support many idol pages (tenants) inside one SaaS platform while keeping tenant data isolated by tenant_id in feature modules.

The design follows this sequence:
1. Create the database.
2. Create global platform entities.
3. Add tenant identity/customization.
4. Add content systems.
5. Add commerce systems.
6. Add per-tenant settings.
7. Add convenience views for admin/reporting.

## File-by-File Intent

### Schema Overview.sql
Purpose:
- Bootstraps the database itself (idol1st) with utf8mb4 and utf8mb4_unicode_ci.

Why it matters:
- Ensures full Unicode support for multilingual user content, names, comments, and post text.

### Layer 1 - Platform.sql
Purpose:
- Defines SaaS-wide identity and tenancy foundations.

What it establishes:
- tenants: each idol page/agency is a tenant.
- users: global fan/user accounts shared across the SaaS.
- tenant_users: membership and role mapping between users and tenants.

Design intention:
- A single user can participate in many tenants.
- Roles are tenant-scoped (fan, moderator, tenant_admin).
- Cascading deletes clean up tenant/user relationships automatically.

### Layer 2 - Identity.sql
Purpose:
- Defines how each tenant presents itself publicly (branding and links).

What it establishes:
- idol_profiles: one profile per tenant for visual identity and biography.
- tenant_assets: upload history/asset registry by tenant.
- platform_links: external/social links shown on the tenant page.

Design intention:
- Keep display personalization separate from platform accounts.
- Preserve media/asset history and metadata.
- Support ordered/active external links for customizable profile pages.

### Layer 3 - Content.sql
Purpose:
- Supports tenant-driven publishing and community interaction.

What it establishes:
- blog_posts: tenant posts with publish states.
- comments: moderation-ready threaded-like base comments per post.
- fan_contents: fan-submitted media/content with moderation states.

Design intention:
- Provide moderation-first workflows (pending, approved, hidden/rejected/spam).
- Keep publication controls flexible (draft, published, members_only).
- Allow tenant communities to contribute safely.

### Layer 4 - Commerce.sql
Purpose:
- Enables tenant storefront and purchase flows.

What it establishes:
- products: tenant product catalog with stock and lifecycle status.
- orders: buyer order headers and status lifecycle.
- order_items: immutable line-item snapshots for historical correctness.

Design intention:
- Store prices in cents to avoid floating-point money errors.
- Snapshot product name and unit price at purchase time.
- Maintain order history even if product definitions change later.

### Layer 5 - Settings.sql
Purpose:
- Centralizes per-tenant feature toggles and moderation defaults.

What it establishes:
- page_settings: exactly one row per tenant for visibility/modules/moderation behavior.

Design intention:
- Avoid scattering feature flags across many tables.
- Keep tenant behavior configurable without schema changes.

### Useful Views.sql
Purpose:
- Provides read-optimized views for dashboards and moderation operations.

What it establishes:
- v_tenant_summary: joins profile/settings and aggregated counts for admin overview.
- v_pending_moderation: unified moderation queue from comments and fan content.

Design intention:
- Simplify application queries for common admin use cases.
- Reduce repetitive SQL logic in backend code.

### Idol1st - EER Diagram (1st Draft).mwb
Purpose:
- Visual modeling artifact for schema structure and relationships.

Design intention:
- Make entity relationships and layer boundaries easier to review collaboratively.

## Architectural Intent (Cross-File)
- Multi-tenant by design: tenant_id is applied in tenant-scoped layers.
- Layered modularity: platform core is separate from content/commerce/settings.
- Operational safety: enum statuses and role mapping enforce workflow states.
- Maintainability: views expose high-value read models for frequent UI needs.

## Notes on Recent Hardening Changes
The scripts were adjusted to reduce common operational errors:
- CREATE TABLE IF NOT EXISTS added to layer tables for safer reruns.
- View creation made idempotent using DROP VIEW IF EXISTS before CREATE VIEW.
- Commerce integrity tightened:
  - stock constrained to >= -1 (where -1 means unlimited).
  - order_items.quantity now unsigned and constrained to >= 1.
  - indexes added for order_items foreign key columns.
- page_settings now includes created_at for better auditing parity.

These updates preserve the original business intent while reducing migration and data-quality risk.
