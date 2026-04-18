# Layer 2 Creator Design (Idol/Agency Website Creation)

## Product Goal
Deliver a smooth onboarding path where creators:
1. Sign up.
2. Choose site type (Idol or Agency).
3. Get template suggestions.
4. Build pages through drag-and-drop blocks.
5. Save and publish safely.

This keeps Idol and Agency under one core system while allowing different defaults and UI treatment.

## Current MVP Implemented in App
- Signup flow:
  - GET /creator/signup
  - POST /creator/signup
- Setup flow:
  - GET /creator/setup
  - POST /creator/setup
- Visual builder:
  - GET /creator/builder
  - POST /creator/builder/save
- Saved drafts are currently stored as JSON in storage/app/private/site-drafts.

## Core Domain Model
Use one platform foundation, then specialize through profile mode and templates.

### Existing Layer 1 and Layer 2 Base
- tenants: one site container.
- users: account owner/team members.
- tenant_users: role per tenant.
- idol_profiles: visual identity and branding.
- tenant_assets: media registry.
- platform_links: social/streaming links.

### Creator-Centric Extension (Recommended)
Add these tables to support visual builder persistence and versioning.

1. site_templates
- Purpose: store official starter templates.
- Key fields:
  - id (uuid)
  - key (spotlight, neon-stage, classic-label, agency-grid)
  - site_type_scope (idol, agency, both)
  - defaults_json (palette, default pages, default blocks)
  - is_active

2. site_pages
- Purpose: tenant pages in route order.
- Key fields:
  - id
  - tenant_id
  - slug
  - title
  - is_home
  - sort_order
  - visibility (public, members_only, private)

3. site_blocks
- Purpose: ordered blocks inside each page.
- Key fields:
  - id
  - tenant_id
  - page_id
  - block_type (hero, bio, social-links, updates, gallery, merch)
  - block_data_json (content + settings)
  - sort_order
  - is_active

4. site_drafts
- Purpose: working copies and autosave history.
- Key fields:
  - id
  - tenant_id
  - editor_user_id
  - payload_json
  - status (draft, published_snapshot)
  - created_at

## Why this aligns with Layer 2
Layer 2 is identity-centric. The visual builder is effectively an identity composition engine:
- idol_profiles stores base identity tokens (colors, font choices, hero assets).
- site_templates gives UI personality per site type.
- site_pages/site_blocks renders structured pages consistently.

## Idol vs Agency Strategy (without splitting stack)
Keep one builder, but provide mode-aware defaults.

### Idol Mode defaults
- Suggested pages: Home, Schedule, Gallery, Merch.
- Hero emphasizes individual persona and social links.
- Intro copy and CTA point to fan engagement.

### Agency Mode defaults
- Suggested pages: Home, Talents, News, Events, Merch.
- Hero emphasizes brand and roster visibility.
- Talents page uses card/grid block type.

Both use same engine, different template seed data.

## Builder UX Blueprint
1. Setup screen:
- Select site type.
- Enter name and slug.
- Choose template suggestion.
- Pick primary color.

2. Builder screen:
- Left panel: block palette.
- Center: page canvas.
- Block-level inline editing.
- Save draft action.

3. Publish flow (next phase):
- Validate required blocks.
- Snapshot current draft as published version.
- Regenerate tenant route cache for fast serve.

## Validation Rules (Minimum)
- Slug: lowercase alphanumeric and dash only.
- One home page per tenant.
- Blocks ordered without gaps.
- Block payload size cap to avoid abuse.
- Owner or tenant_admin required for publish.

## API Design for Next Iteration
- POST /api/creator/sites
- GET /api/creator/sites/{tenant}/pages
- POST /api/creator/sites/{tenant}/pages
- PATCH /api/creator/pages/{page}
- POST /api/creator/pages/{page}/blocks
- PATCH /api/creator/blocks/{block}
- POST /api/creator/sites/{tenant}/publish

## Agency Talent Tree (Future)
Future route shape example:
- /agency-slug
- /agency-slug/talents
- /agency-slug/talents/talent-slug

Defer now, but design for this by introducing in future:
- talents table linked to agency tenant.
- optional per-talent child page set.
- shared component system for cross-talent consistency.

## Practical Next Build Steps
1. Convert JSON draft storage into DB tables site_pages/site_blocks/site_drafts.
2. Add multi-page support in builder UI.
3. Add template seeding command for idol and agency presets.
4. Add publish workflow and public renderer route by tenant slug.
