# Fan Platform — Implementation Checklist Plan
# Steps 8–17

---

## Step 8 — Multi-Tenancy Foundation
> Prerequisite for all fan and tenant-admin features. Nothing else can be built without this.

### Migrations (run in order)
- [ ] `create_plans_table` — id (uuid), name, price, billing_cycle enum, is_active
- [ ] `create_tenants_table` — id (uuid), name, status enum, created_by, suspended_at, config JSON
- [ ] `create_tenant_subscriptions_table` — id, tenant_id FK, plan_id FK, start_date, end_date, status enum

### Models
- [ ] `app/Models/Plan.php` — fillables, casts, `tenants()` relationship
- [ ] `app/Models/Tenant.php` — fillables, casts, `plan()`, `subscription()`, `admins()` relationships
- [ ] `app/Models/TenantSubscription.php` — fillables, casts, `tenant()`, `plan()` relationships

### Middleware
- [ ] `app/Http/Middleware/ResolveTenant.php` — reads `X-Tenant-ID` header, binds tenant to request, returns 404 if not found, 403 if suspended

### Resources
- [ ] `app/Http/Resources/TenantResource.php`
- [ ] `app/Http/Resources/PlanResource.php`

### Requests
- [ ] `app/Http/Requests/Admin/StoreTenantRequest.php` — name (required), plan_id (required, uuid)
- [ ] `app/Http/Requests/Admin/StorePlanRequest.php` — name, price, billing_cycle
- [ ] `app/Http/Requests/Admin/SuspendTenantRequest.php` — reason (required)
- [ ] `app/Http/Requests/Admin/AssignPlanRequest.php` — plan_id (required, uuid)

### Controllers
- [ ] `app/Http/Controllers/Admin/TenantController.php`
  - [ ] `index` — paginated list, filter by status/search
  - [ ] `store` — create tenant + attach plan
  - [ ] `show` — single tenant with config + subscription
  - [ ] `update` — patch name/config
  - [ ] `suspend` — set status to SUSPENDED, record reason + suspended_at
  - [ ] `reactivate` — set status back to ACTIVE
  - [ ] `impersonate` — generate short-lived token for a target user within the tenant
- [ ] `app/Http/Controllers/Admin/PlanController.php`
  - [ ] `index` — list all plans
  - [ ] `store` — create plan
  - [ ] `assignToTenant` — PUT /api/admin/tenants/{id}/plan

### Routes
- [ ] Add to `routes/api.php` under `['auth:sanctum', 'ensure.admin']` middleware:
  - [ ] `GET    /api/admin/tenants`
  - [ ] `POST   /api/admin/tenants`
  - [ ] `GET    /api/admin/tenants/{tenantId}`
  - [ ] `PATCH  /api/admin/tenants/{tenantId}`
  - [ ] `POST   /api/admin/tenants/{tenantId}/suspend`
  - [ ] `POST   /api/admin/tenants/{tenantId}/reactivate`
  - [ ] `POST   /api/admin/tenants/{tenantId}/impersonate`
  - [ ] `GET    /api/admin/plans`
  - [ ] `POST   /api/admin/plans`
  - [ ] `PUT    /api/admin/tenants/{tenantId}/plan`
- [ ] Register `ResolveTenant` middleware alias (`resolve.tenant`) in `bootstrap/app.php`

### Notes
- Tenant IDs are UUIDs — use `$table->uuid('id')->primary()` not `$table->id()`
- `config` column stores branding (logo, colors, custom domain, settings) as JSON
- `impersonate` generates a short-lived Sanctum token (e.g. 1 hour expiry) — use `createToken()` with `expiresAt`
- All subsequent steps' routes must include `resolve.tenant` middleware

---

## Step 9 — Platform Admin Auth + Feature Flags + Audit Logs
> Completes the platform admin layer. Service admins are separate from the User model.

### Migrations
- [ ] `create_service_admins_table` — id (uuid), email, password, role enum (SUPER_ADMIN, SUPPORT, BILLING_ADMIN, OPS), mfa_enabled, mfa_secret (nullable), is_active, last_login_at
- [ ] `create_feature_flags_table` — id (uuid), name, is_globally_enabled, created_at
- [ ] `create_feature_flag_tenant_table` — flag_id FK, tenant_id FK, is_enabled (pivot)
- [ ] `create_audit_logs_table` — id (uuid), tenant_id (nullable), admin_id, action, target_entity, target_id, performed_at

### Models
- [ ] `app/Models/ServiceAdmin.php` — `HasApiTokens`, fillables, `tenantOverrides()` relationship
- [ ] `app/Models/FeatureFlag.php` — fillables, `tenants()` belongsToMany with pivot `is_enabled`
- [ ] `app/Models/AuditLog.php` — fillables, casts, readonly (no update)

### Middleware
- [ ] `app/Http/Middleware/EnsureServiceAdmin.php` — validates `AdminBearerAuth` token belongs to a `ServiceAdmin`, not a regular `User`

### Resources
- [ ] `app/Http/Resources/ServiceAdminResource.php`
- [ ] `app/Http/Resources/FeatureFlagResource.php`
- [ ] `app/Http/Resources/AuditLogResource.php`

### Requests
- [ ] `app/Http/Requests/Admin/PlatformLoginRequest.php` — email, password
- [ ] `app/Http/Requests/Admin/MfaVerifyRequest.php` — token (6-digit string)
- [ ] `app/Http/Requests/Admin/StoreFeatureFlagRequest.php` — name (required)
- [ ] `app/Http/Requests/Admin/FeatureFlagOverrideRequest.php` — is_enabled (boolean, required)

### Controllers
- [ ] `app/Http/Controllers/Admin/PlatformAdminAuthController.php`
  - [ ] `login` — validate credentials, check is_active, return token + mfa_required flag
  - [ ] `verifyMfa` — validate TOTP token, complete auth
  - [ ] `logout` — revoke token
- [ ] `app/Http/Controllers/Admin/FeatureFlagController.php`
  - [ ] `index` — list all flags
  - [ ] `store` — create flag
  - [ ] `setTenantOverride` — PUT enable/disable for a specific tenant
  - [ ] `rollout` — set is_globally_enabled = true
- [ ] `app/Http/Controllers/Admin/AuditLogController.php`
  - [ ] `index` — paginated, filter by tenant_id, action, from, until

### Routes
- [ ] Add to `routes/api.php`:
  - [ ] `POST /api/admin/auth/login` (public)
  - [ ] `POST /api/admin/auth/mfa/verify` (requires admin token)
  - [ ] `POST /api/admin/auth/logout` (requires admin token)
  - [ ] `GET    /api/admin/feature-flags`
  - [ ] `POST   /api/admin/feature-flags`
  - [ ] `PUT    /api/admin/feature-flags/{flagId}/tenants/{tenantId}`
  - [ ] `POST   /api/admin/feature-flags/{flagId}/rollout`
  - [ ] `GET    /api/admin/audit-logs`

### Notes
- MFA uses TOTP (time-based one-time passwords) — consider `pragmarx/google2fa` package
- `AuditLog` records should be written automatically — consider a helper `AuditLog::record(action, entity, id)` called from controllers
- `EnsureServiceAdmin` is a separate middleware from `EnsureAdmin` (Step 7) — service admins authenticate against `service_admins` table, not `users`

---

## Step 10 — Tenant Admin Auth + Idol Profile
> First tenant-scoped step. All routes require both `resolve.tenant` and `ensure.tenant.admin` middleware.

### Migrations
- [ ] `create_tenant_admins_table` — id (uuid), tenant_id FK, email, password, name, created_at
- [ ] `create_idol_profiles_table` — id (uuid), tenant_id FK (unique — one profile per tenant), stage_name, bio, debut_date, agency, nationality, profile_image_url, banner_image_url, status enum (ACTIVE, HIATUS, RETIRED)
- [ ] `create_idol_groups_table` — id (uuid), tenant_id FK, group_name, debut_date, agency, bio, profile_image_url
- [ ] `create_idol_group_members_table` — group_id FK, idol_profile_id FK (pivot)
- [ ] `create_social_links_table` — id (uuid), idol_profile_id FK, platform enum, url, follower_count, last_synced_at

### Models
- [ ] `app/Models/TenantAdmin.php` — `HasApiTokens`, tenant-scoped, fillables
- [ ] `app/Models/IdolProfile.php` — fillables, `tenant()`, `socialLinks()`, `groups()` relationships
- [ ] `app/Models/IdolGroup.php` — fillables, `members()` belongsToMany IdolProfile
- [ ] `app/Models/SocialLink.php` — fillables, platform enum cast

### Middleware
- [ ] `app/Http/Middleware/EnsureTenantAdmin.php` — validates token belongs to a `TenantAdmin` scoped to the resolved tenant

### Resources
- [ ] `app/Http/Resources/TenantAdminResource.php`
- [ ] `app/Http/Resources/IdolProfileResource.php` — includes social_links array
- [ ] `app/Http/Resources/IdolGroupResource.php` — includes members array
- [ ] `app/Http/Resources/SocialLinkResource.php`

### Requests
- [ ] `app/Http/Requests/Manage/TenantAdminLoginRequest.php` — email, password
- [ ] `app/Http/Requests/Manage/UpdateIdolProfileRequest.php` — all optional: stage_name, bio, debut_date, agency, nationality, status, profile_image (file), banner_image (file)
- [ ] `app/Http/Requests/Manage/StoreSocialLinkRequest.php` — platform (enum, required), url (required)
- [ ] `app/Http/Requests/Manage/StoreIdolGroupRequest.php` — group_name (required), debut_date, agency, bio, member_ids (array of uuids)

### Controllers
- [ ] `app/Http/Controllers/Manage/TenantAdminAuthController.php`
  - [ ] `login` — tenant-scoped credential check, return token
  - [ ] `logout` — revoke token
- [ ] `app/Http/Controllers/Manage/IdolProfileController.php`
  - [ ] `show` — get the tenant's idol profile
  - [ ] `update` — multipart update, handle profile/banner image upload to storage
- [ ] `app/Http/Controllers/Manage/SocialLinkController.php`
  - [ ] `upsert` — create or update by platform (one link per platform per idol)
- [ ] `app/Http/Controllers/Manage/IdolGroupController.php`
  - [ ] `index` — list groups for this tenant
  - [ ] `store` — create group with member_ids pivot sync

### Routes
- [ ] Register `ensure.tenant.admin` middleware alias in `bootstrap/app.php`
- [ ] Add to `routes/api.php` under `['resolve.tenant', 'ensure.tenant.admin']`:
  - [ ] `POST /api/manage/auth/login` (only `resolve.tenant`, no admin auth yet)
  - [ ] `POST /api/manage/auth/logout`
  - [ ] `GET  /api/manage/idol/profile`
  - [ ] `PUT  /api/manage/idol/profile`
  - [ ] `POST /api/manage/idol/social-links`
  - [ ] `GET  /api/manage/idol/groups`
  - [ ] `POST /api/manage/idol/groups`

### Notes
- One `IdolProfile` per tenant (enforced via unique constraint on `tenant_id`)
- Image uploads follow the same pattern as `AssetController` from Step 5 — store to disk, save path
- `SocialLinkController::upsert` uses `updateOrCreate(['idol_profile_id' => ..., 'platform' => ...], [...])`

---

## Step 11 — Blog (Tenant Admin + Fan-Facing)
> Both the management side and the fan-reading side in one step. Introduces the visibility gate pattern used by merch and events too.

### Migrations
- [ ] `create_blog_categories_table` — id (uuid), tenant_id FK, name
- [ ] `create_blog_posts_table` — id (uuid), tenant_id FK, category_id (nullable FK), title, content (longText), cover_image_url, tags (JSON), status enum (DRAFT, PUBLISHED, ARCHIVED), visibility enum (PUBLIC, SUBSCRIBERS_ONLY, PAID_ONLY), published_at (nullable)
- [ ] `create_blog_comments_table` — id (uuid), post_id FK, fan_id FK, content, is_hidden (default false)
- [ ] `create_blog_post_likes_table` — post_id FK, fan_id FK (unique together)

### Models
- [ ] `app/Models/BlogCategory.php`
- [ ] `app/Models/BlogPost.php` — fillables, casts (tags → array), `category()`, `comments()`, `likes()` relationships, `like_count` + `comment_count` appended attributes
- [ ] `app/Models/BlogComment.php` — fillables, `post()`, `fan()` relationships
- [ ] `app/Models/BlogPostLike.php` — pivot model

### Services
- [ ] `app/Services/VisibilityGateService.php`
  - [ ] `canView(Fan|null $fan, string $visibility): bool` — PUBLIC = always, SUBSCRIBERS_ONLY = fan has active subscription, PAID_ONLY = fan has paid tier subscription
  - [ ] Used by blog, events, and merch to gate content

### Resources
- [ ] `app/Http/Resources/BlogPostResource.php` — includes category, like_count, comment_count
- [ ] `app/Http/Resources/BlogCommentResource.php`
- [ ] `app/Http/Resources/BlogCategoryResource.php`

### Requests
- [ ] `app/Http/Requests/Manage/StoreBlogPostRequest.php` — title, content (required), category_id, tags, visibility, status, publish_at
- [ ] `app/Http/Requests/Fan/StoreBlogCommentRequest.php` — content (required)

### Controllers
- [ ] `app/Http/Controllers/Manage/BlogController.php` (tenant admin)
  - [ ] `index` — list all posts (any status), filter by status
  - [ ] `store` — create post
  - [ ] `publish` — set status to PUBLISHED, set published_at = now()
  - [ ] `hideComment` — set is_hidden = true on a comment
- [ ] `app/Http/Controllers/Fan/BlogController.php` (fan-facing)
  - [ ] `index` — list PUBLISHED posts, apply visibility gate, filter by category/tag
  - [ ] `show` — single post, apply visibility gate, return 403 if gated
  - [ ] `like` — toggle like (insert or delete from likes pivot)
  - [ ] `comments` — list visible (not hidden) comments
  - [ ] `storeComment` — create comment (requires fan auth)

### Routes
- [ ] Under `['resolve.tenant', 'ensure.tenant.admin']`:
  - [ ] `GET  /api/manage/blog/posts`
  - [ ] `POST /api/manage/blog/posts`
  - [ ] `POST /api/manage/blog/posts/{postId}/publish`
  - [ ] `POST /api/manage/blog/comments/{commentId}/hide`
- [ ] Under `resolve.tenant` (fan routes, optional fan auth):
  - [ ] `GET  /api/blog/posts`
  - [ ] `GET  /api/blog/posts/{postId}`
  - [ ] `GET  /api/blog/posts/{postId}/comments`
  - [ ] `POST /api/blog/posts/{postId}/like` (requires fan auth)
  - [ ] `POST /api/blog/posts/{postId}/comments` (requires fan auth)

### Notes
- `VisibilityGateService` is the key shared piece — build it generically so Steps 13 and 15 can reuse it
- Fan auth on optional routes: use `auth:sanctum` with `sometimes` — unauthenticated users see PUBLIC content only

---

## Step 12 — Membership Tiers + Fan Auth
> The monetisation layer and fan identity. Must come before Step 11 fan routes go live, since the visibility gate depends on fan subscription status.

### Migrations
- [ ] `create_fans_table` — id (uuid), tenant_id FK, email (unique per tenant), username, display_name, avatar_url, password
- [ ] `create_membership_tiers_table` — id (uuid), tenant_id FK, name, price, billing_cycle enum, max_members (nullable), is_active
- [ ] `create_tier_perks_table` — id (uuid), tier_id FK, description, perk_type enum
- [ ] `create_fan_subscriptions_table` — id (uuid), fan_id FK, tier_id FK, start_date, end_date (nullable), status enum (ACTIVE, EXPIRING, EXPIRED, CANCELLED), auto_renew

### Models
- [ ] `app/Models/Fan.php` — `HasApiTokens`, fillables, `tenant()`, `subscription()`, `activeSubscription()` helper
- [ ] `app/Models/MembershipTier.php` — fillables, `perks()`, `fans()` relationships
- [ ] `app/Models/TierPerk.php` — fillables
- [ ] `app/Models/FanSubscription.php` — fillables, casts, `fan()`, `tier()` relationships

### Middleware
- [ ] `app/Http/Middleware/EnsureFan.php` — validates token belongs to a `Fan` scoped to the resolved tenant

### Resources
- [ ] `app/Http/Resources/FanResource.php` — includes subscription if loaded
- [ ] `app/Http/Resources/MembershipTierResource.php` — includes perks
- [ ] `app/Http/Resources/FanSubscriptionResource.php` — includes tier

### Requests
- [ ] `app/Http/Requests/Fan/RegisterFanRequest.php` — email, username, password, password_confirmation, display_name
- [ ] `app/Http/Requests/Fan/LoginFanRequest.php` — email, password
- [ ] `app/Http/Requests/Fan/SubscribeRequest.php` — tier_id, payment_method, auto_renew
- [ ] `app/Http/Requests/Fan/UpgradeSubscriptionRequest.php` — tier_id
- [ ] `app/Http/Requests/Manage/StoreMembershipTierRequest.php` — name, price, billing_cycle, max_members, perks array

### Controllers
- [ ] `app/Http/Controllers/Fan/FanAuthController.php`
  - [ ] `register` — create fan scoped to tenant, return token + fan
  - [ ] `login` — tenant-scoped auth, return token + fan
  - [ ] `logout` — revoke token
- [ ] `app/Http/Controllers/Manage/MembershipTierController.php`
  - [ ] `index` — list tiers for tenant
  - [ ] `store` — create tier with perks
- [ ] `app/Http/Controllers/Fan/FanSubscriptionController.php`
  - [ ] `tiers` — list active tiers for tenant
  - [ ] `subscribe` — create subscription (payment handled in Step 14)
  - [ ] `show` — get current subscription
  - [ ] `cancel` — set status to CANCELLED
  - [ ] `upgrade` — change tier, adjust end_date

### Routes
- [ ] Under `resolve.tenant` (public fan auth):
  - [ ] `POST /api/auth/register`
  - [ ] `POST /api/auth/login`
  - [ ] `POST /api/auth/logout` (requires fan auth)
- [ ] Under `['resolve.tenant', 'ensure.fan']`:
  - [ ] `GET  /api/membership/tiers` (public — no fan auth needed)
  - [ ] `POST /api/membership/subscribe`
  - [ ] `GET  /api/membership/subscription`
  - [ ] `POST /api/membership/subscription/cancel`
  - [ ] `POST /api/membership/subscription/upgrade`
- [ ] Under `['resolve.tenant', 'ensure.tenant.admin']`:
  - [ ] `GET  /api/manage/membership/tiers`
  - [ ] `POST /api/manage/membership/tiers`

### Notes
- Fan email uniqueness is **per tenant**, not globally — use a unique constraint on `[tenant_id, email]`
- `Fan` model uses `HasApiTokens` just like `User` — Sanctum supports multiple authenticatable models
- Register `ensure.fan` as a middleware alias in `bootstrap/app.php`
- Payment processing on `subscribe` is stubbed here — the webhook in Step 14 finalises the subscription status

---

## Step 13 — Merch (Tenant Admin + Fan-Facing)
> The most complex step. Stock management, cart, checkout, and multi-payment-method support.

### Migrations
- [ ] `create_merch_categories_table` — id (uuid), tenant_id FK, name
- [ ] `create_merch_products_table` — id (uuid), tenant_id FK, category_id (nullable FK), name, description, base_price, currency, cover_image_url, images (JSON), status enum, is_limited_edition, available_from, available_until
- [ ] `create_merch_variants_table` — id (uuid), product_id FK, sku (unique), attributes (JSON), price, stock_qty, available_qty
- [ ] `create_merch_carts_table` — id (uuid), fan_id FK, tenant_id FK (one cart per fan per tenant, unique together)
- [ ] `create_merch_cart_items_table` — id (uuid), cart_id FK, product_id FK, variant_id FK, quantity, unit_price
- [ ] `create_addresses_table` — id (uuid), fan_id FK, street, city, state, country, postal_code, is_default
- [ ] `create_merch_orders_table` — id (uuid), fan_id FK, tenant_id FK, shipping_address_id FK (snapshot), total_amount, currency, status enum, placed_at
- [ ] `create_merch_order_items_table` — id (uuid), order_id FK, product_name (snapshot), sku (snapshot), quantity, unit_price, subtotal
- [ ] `create_payments_table` — id (uuid), order_id FK (nullable), subscription_id FK (nullable), amount, currency, status enum, method enum, transaction_id, paid_at
- [ ] `create_shipments_table` — id (uuid), order_id FK, tracking_number, carrier, status enum, shipped_at, estimated_delivery

### Models
- [ ] `app/Models/MerchProduct.php` — fillables, `variants()`, `category()` relationships
- [ ] `app/Models/MerchVariant.php` — fillables, casts (attributes → array), `product()` relationship
- [ ] `app/Models/MerchCart.php` — fillables, `items()`, `fan()` relationships, `subtotal` + `total` computed attributes
- [ ] `app/Models/MerchCartItem.php` — fillables, `product()`, `variant()` relationships
- [ ] `app/Models/Address.php` — fillables, `fan()` relationship
- [ ] `app/Models/MerchOrder.php` — fillables, `items()`, `payment()`, `shipment()` relationships
- [ ] `app/Models/MerchOrderItem.php` — fillables (product_name/sku are snapshots, not FKs)
- [ ] `app/Models/Payment.php` — fillables, casts
- [ ] `app/Models/Shipment.php` — fillables, casts

### Services
- [ ] `app/Services/CartService.php`
  - [ ] `getOrCreate(Fan $fan, Tenant $tenant): MerchCart`
  - [ ] `addItem(MerchCart $cart, $productId, $variantId, int $qty): MerchCart`
  - [ ] `updateItem(MerchCartItem $item, int $qty): MerchCart`
  - [ ] `removeItem(MerchCartItem $item): MerchCart`
  - [ ] `recalculate(MerchCart $cart): void` — updates unit prices from current variant prices
- [ ] `app/Services/CheckoutService.php`
  - [ ] `checkout(MerchCart $cart, $addressId, string $paymentMethod, ?string $network): array`
  - [ ] Decrements `available_qty` on variants (within DB transaction)
  - [ ] Creates `MerchOrder` + `MerchOrderItem` snapshots
  - [ ] Creates `Payment` record with status PENDING
  - [ ] Returns order + payment details (bank transfer QR or Stripe client key)
  - [ ] Rolls back stock decrement if payment creation fails

### Resources
- [ ] `app/Http/Resources/MerchProductResource.php` — includes variants, category
- [ ] `app/Http/Resources/MerchCartResource.php` — includes items with product/variant, subtotal, total
- [ ] `app/Http/Resources/MerchOrderResource.php` — includes items, payment, shipment
- [ ] `app/Http/Resources/AddressResource.php`

### Requests
- [ ] `app/Http/Requests/Manage/StoreMerchProductRequest.php`
- [ ] `app/Http/Requests/Manage/UpdateVariantStockRequest.php` — stock_qty (integer, required)
- [ ] `app/Http/Requests/Manage/ShipOrderRequest.php` — tracking_number, carrier, estimated_delivery
- [ ] `app/Http/Requests/Fan/AddCartItemRequest.php` — product_id, variant_id, quantity (min 1)
- [ ] `app/Http/Requests/Fan/UpdateCartItemRequest.php` — quantity (min 1)
- [ ] `app/Http/Requests/Fan/CheckoutRequest.php` — address_id, payment_method, transfer_network (required if BANK_TRANSFER)
- [ ] `app/Http/Requests/Fan/StoreAddressRequest.php` — street, city, country (required), state, postal_code, is_default

### Controllers
- [ ] `app/Http/Controllers/Manage/MerchController.php`
  - [ ] `index` — list products, filter by status
  - [ ] `store` — create product with variants
  - [ ] `updateStock` — PATCH variant stock_qty + available_qty
  - [ ] `orders` — list orders for tenant, filter by status
  - [ ] `ship` — create shipment, update order status to SHIPPED
- [ ] `app/Http/Controllers/Fan/MerchController.php`
  - [ ] `products` — browse active products, filter by category/limited edition
  - [ ] `cart` — get current cart
  - [ ] `addItem` — add to cart via CartService
  - [ ] `updateItem` — update qty via CartService
  - [ ] `removeItem` — remove via CartService
  - [ ] `checkout` — initiate checkout via CheckoutService
  - [ ] `orders` — fan order history
  - [ ] `showOrder` — single order with items/payment/shipment
  - [ ] `cancelOrder` — set order to CANCELLED (only if status is PENDING)

### Routes
- [ ] Under `['resolve.tenant', 'ensure.tenant.admin']`:
  - [ ] `GET   /api/manage/merch/products`
  - [ ] `POST  /api/manage/merch/products`
  - [ ] `PATCH /api/manage/merch/variants/{variantId}/stock`
  - [ ] `GET   /api/manage/merch/orders`
  - [ ] `POST  /api/manage/merch/orders/{orderId}/ship`
- [ ] Under `resolve.tenant` (public product browse):
  - [ ] `GET   /api/merch/products`
- [ ] Under `['resolve.tenant', 'ensure.fan']`:
  - [ ] `GET    /api/merch/cart`
  - [ ] `POST   /api/merch/cart/items`
  - [ ] `PATCH  /api/merch/cart/items/{itemId}`
  - [ ] `DELETE /api/merch/cart/items/{itemId}`
  - [ ] `POST   /api/merch/checkout`
  - [ ] `GET    /api/merch/orders`
  - [ ] `GET    /api/merch/orders/{orderId}`
  - [ ] `POST   /api/merch/orders/{orderId}/cancel`

### Notes
- `MerchOrderItem` stores `product_name` and `sku` as plain strings — these are **snapshots** at time of purchase, not FKs. This means order history stays accurate even if the product is later deleted or renamed
- Stock decrement must happen inside a DB transaction — `available_qty` goes down on checkout, `stock_qty` goes down when shipment is confirmed
- `available_from` / `available_until` should be checked in the fan browse endpoint

---

## Step 14 — Payment Webhooks
> Handles async payment confirmation from all providers. Transitions order/subscription status from PENDING to PAID (or FAILED).

### Migrations
- [ ] None — reuses `payments` table from Step 13

### Services
- [ ] `app/Services/Payment/StripeWebhookHandler.php`
  - [ ] Verify Stripe signature header (`Stripe-Signature`)
  - [ ] Handle `payment_intent.succeeded` → mark payment COMPLETED, order PAID
  - [ ] Handle `payment_intent.payment_failed` → mark payment FAILED, restore stock
- [ ] `app/Services/Payment/PaypalWebhookHandler.php`
  - [ ] Verify PayPal IPN/webhook
  - [ ] Handle payment completion / failure
- [ ] `app/Services/Payment/QrPaymentWebhookHandler.php`
  - [ ] Handles PromptPay, DuitNow, QRIS, PayNow, WechatPay, Alipay
  - [ ] Verify provider-specific signature
  - [ ] Handle payment completion / failure / expiry
- [ ] `app/Services/Payment/PaymentWebhookDispatcher.php`
  - [ ] Routes incoming webhook to correct handler based on `{provider}` path param

### Controllers
- [ ] `app/Http/Controllers/PaymentWebhookController.php`
  - [ ] `handle` — receives all providers, delegates to dispatcher, always returns 200

### Routes
- [ ] Public (no auth — providers call this directly):
  - [ ] `POST /api/webhooks/payment/{provider}`
- [ ] Add `VerifyCsrfToken` exception for `/api/webhooks/*` in middleware config

### Notes
- Webhook endpoints must be excluded from CSRF verification
- Always return HTTP 200 to webhook providers even on internal errors — log the error and handle async, never let a retry storm hit your DB
- Restore `available_qty` on failed payments (reverse the decrement from Step 13 checkout)
- On subscription payment completion, activate the `FanSubscription` (set status to ACTIVE, set start_date)

---

## Step 15 — Events + RSVP
> Events are visibility-gated like blog posts. RSVP counts are aggregated per event.

### Migrations
- [ ] `create_idol_events_table` — id (uuid), tenant_id FK, title, description, event_type enum, start_datetime, end_datetime (nullable), location, ticket_url, visibility enum, status enum
- [ ] `create_event_rsvps_table` — id (uuid), event_id FK, fan_id FK, status enum (GOING, INTERESTED, NOT_GOING) — unique on [event_id, fan_id]

### Models
- [ ] `app/Models/IdolEvent.php` — fillables, casts, `rsvps()`, `rsvpCounts()` computed attribute
- [ ] `app/Models/EventRsvp.php` — fillables, `event()`, `fan()` relationships

### Resources
- [ ] `app/Http/Resources/IdolEventResource.php` — includes rsvp_counts
- [ ] `app/Http/Resources/EventRsvpResource.php`

### Requests
- [ ] `app/Http/Requests/Manage/StoreEventRequest.php` — title, event_type, start_datetime (required), description, end_datetime, location, ticket_url, visibility
- [ ] `app/Http/Requests/Fan/RsvpRequest.php` — status enum (GOING, INTERESTED, NOT_GOING)

### Controllers
- [ ] `app/Http/Controllers/Manage/EventController.php`
  - [ ] `index` — list events, filter by status
  - [ ] `store` — create event
- [ ] `app/Http/Controllers/Fan/EventController.php`
  - [ ] `index` — list events, apply visibility gate, filter by type
  - [ ] `rsvp` — upsert RSVP (updateOrCreate on event_id + fan_id), return new counts

### Routes
- [ ] Under `['resolve.tenant', 'ensure.tenant.admin']`:
  - [ ] `GET  /api/manage/events`
  - [ ] `POST /api/manage/events`
- [ ] Under `resolve.tenant` (optional fan auth):
  - [ ] `GET  /api/events`
- [ ] Under `['resolve.tenant', 'ensure.fan']`:
  - [ ] `POST /api/events/{eventId}/rsvp`

### Notes
- Reuse `VisibilityGateService` from Step 11
- `rsvpCounts` should use a single aggregation query: `GROUP BY status COUNT(*)` — don't do three separate queries

---

## Step 16 — Fan Profile + Addresses
> Fan self-service. Avatar upload follows the same pattern as idol profile images (Step 10).

### Migrations
- [ ] None — `fans` table from Step 12, `addresses` table from Step 13

### Resources
- [ ] Reuse `FanResource` and `AddressResource` from Steps 12 and 13

### Requests
- [ ] `app/Http/Requests/Fan/UpdateFanProfileRequest.php` — display_name (optional), avatar (optional file, image/*)
- [ ] Reuse `StoreAddressRequest` from Step 13

### Controllers
- [ ] `app/Http/Controllers/Fan/FanProfileController.php`
  - [ ] `show` — return authenticated fan with subscription
  - [ ] `update` — update display_name, handle avatar upload if provided
- [ ] `app/Http/Controllers/Fan/AddressController.php`
  - [ ] `index` — list fan's addresses
  - [ ] `store` — add new address; if is_default = true, unset any existing default first

### Routes
- [ ] Under `['resolve.tenant', 'ensure.fan']`:
  - [ ] `GET   /api/profile`
  - [ ] `PATCH /api/profile`
  - [ ] `GET   /api/profile/addresses`
  - [ ] `POST  /api/profile/addresses`

### Notes
- When adding a default address, wrap the "unset existing default + set new default" in a DB transaction
- Avatar uploads: store to `avatars/{fan_id}/{uuid}.{ext}` on the public disk, same as Step 5

---

## Step 17 — Notifications
> Final step. Hooks into all previous features to dispatch in-app notifications.

### Migrations
- [ ] `create_fan_notifications_table` — id (uuid), fan_id FK, type enum (NEW_POST, NEW_MERCH, EVENT_REMINDER, SUBSCRIPTION_EXPIRY, NEW_MEDIA, COMEBACK_ALERT), message, is_read (default false), reference_id (uuid, nullable), reference_type (nullable), created_at
- [ ] `create_notification_preferences_table` — id, fan_id FK, type, is_enabled, channel enum (EMAIL, PUSH, IN_APP) — unique on [fan_id, type, channel]

### Models
- [ ] `app/Models/FanNotification.php` — fillables, casts
- [ ] `app/Models/NotificationPreference.php` — fillables

### Services
- [ ] `app/Services/NotificationService.php`
  - [ ] `notify(Fan $fan, string $type, string $message, ?string $refId, ?string $refType): void`
  - [ ] Checks fan's preferences before creating — respects is_enabled per channel
  - [ ] Called from:
    - [ ] `ManageBlogController::publish` → `NEW_POST` to all subscribed fans
    - [ ] `ManageMerchController::store` → `NEW_MERCH` to all fans
    - [ ] `ManageEventController::store` → `EVENT_REMINDER` to all fans
    - [ ] `FanSubscriptionController::cancel` / expiry job → `SUBSCRIPTION_EXPIRY`

### Resources
- [ ] `app/Http/Resources/FanNotificationResource.php`
- [ ] `app/Http/Resources/NotificationPreferenceResource.php`

### Requests
- [ ] `app/Http/Requests/Fan/UpdateNotificationPreferencesRequest.php` — array of {type, is_enabled, channel}

### Controllers
- [ ] `app/Http/Controllers/Fan/NotificationController.php`
  - [ ] `index` — list notifications, filter by unread_only, return unread_count
  - [ ] `readAll` — set is_read = true for all fan's notifications
  - [ ] `preferences` — list current preferences
  - [ ] `updatePreferences` — bulk upsert preferences array

### Routes
- [ ] Under `['resolve.tenant', 'ensure.fan']`:
  - [ ] `GET  /api/notifications`
  - [ ] `POST /api/notifications/read-all`
  - [ ] `GET  /api/notifications/preferences`
  - [ ] `PUT  /api/notifications/preferences`

### Notes
- `readAll` should use a single `UPDATE WHERE fan_id = ? AND is_read = false` — don't load all records into memory
- `updatePreferences` uses `upsert()` on [fan_id, type, channel] for bulk efficiency
- For `NEW_POST` broadcast, consider queuing via Laravel Jobs (`dispatch(new NotifyFansOfNewPost($post))`) rather than notifying inline — a tenant with 10k fans would time out a request otherwise

---

## Recommended Build Order
```
Step 8  → Step 9  → Step 10 → Step 12 → Step 11
→ Step 15 → Step 16 → Step 13 → Step 14 → Step 17
```
Step 8 must go first. Step 12 (Fan auth) must come before Step 11 (Blog) so the visibility gate has a Fan model to work with. Step 13 (Merch) must come before Step 14 (Webhooks). Step 17 (Notifications) last — it hooks into everything.
