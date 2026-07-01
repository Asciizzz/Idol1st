# Project Route Document

Generated from Laravel route registry on 2026-07-01T07:23:55.169Z using `php artisan route:list --except-vendor --json`.

Total routes: **109**

## Conventions

- Web routes: session/cookie stack (`web`) and CSRF protection.
- API routes: stateless (`api`) stack; auth typically via `auth:sanctum`.
- Tenant-aware routes rely on `ResolveTenant` (subdomain or tenant context).

## Route Groups

### Web - Fan Tenant Site (13)

| Method | URI | Name | Action | Middleware |
|---|---|---|---|---|
| GET, HEAD | {tenant}.idol1st.test/ | fan.home | FanSiteController@home | web, ResolveTenant |
| GET, HEAD | {tenant}.idol1st.test/cart | fan.cart | FanSiteController@cart | web, ResolveTenant, EnsureFan |
| POST | {tenant}.idol1st.test/cart/add | - | FanSiteController@addToCart | web, ResolveTenant, EnsureFan |
| GET, HEAD | {tenant}.idol1st.test/checkout | fan.checkout | FanSiteController@checkout | web, ResolveTenant, EnsureFan |
| POST | {tenant}.idol1st.test/checkout | fan.checkout.submit | FanSiteController@placeOrder | web, ResolveTenant, EnsureFan |
| GET, HEAD | {tenant}.idol1st.test/events | fan.events | FanSiteController@events | web, ResolveTenant |
| GET, HEAD | {tenant}.idol1st.test/login | fan.login | FanSiteController@login | web, ResolveTenant |
| POST | {tenant}.idol1st.test/login | fan.login.submit | FanSiteController@loginSubmit | web, ResolveTenant |
| POST | {tenant}.idol1st.test/logout | fan.logout | FanSiteController@logout | web, ResolveTenant |
| GET, HEAD | {tenant}.idol1st.test/membership | fan.membership | FanSiteController@membership | web, ResolveTenant |
| GET, HEAD | {tenant}.idol1st.test/merch | fan.merch | FanSiteController@merch | web, ResolveTenant |
| GET, HEAD | {tenant}.idol1st.test/news | fan.news | FanSiteController@news | web, ResolveTenant |
| GET, HEAD | {tenant}.idol1st.test/order/{order}/success | fan.order.success | FanSiteController@orderSuccess | web, ResolveTenant, EnsureFan |

### Web - Editor and Platform Admin (7)

| Method | URI | Name | Action | Middleware |
|---|---|---|---|---|
| ANY | 127.0.0.1/ | - | Illuminate\Routing\RedirectController | web |
| GET, HEAD | 127.0.0.1/admin | admin | AuthEditorController@showAdmin | web, RequireAuth:admin |
| GET, HEAD | 127.0.0.1/editor | editor | AuthEditorController@showEditor | web, RequireAuth |
| POST | 127.0.0.1/editor/save | editor.save | AuthEditorController@saveEditor | web, RequireAuth |
| GET, HEAD | 127.0.0.1/login | login | AuthEditorController@showLogin | web |
| POST | 127.0.0.1/login | login.submit | AuthEditorController@handleLogin | web |
| POST | 127.0.0.1/logout | logout | AuthEditorController@webLogout | web, RequireAuth |

### API - Editor Auth (3)

| Method | URI | Name | Action | Middleware |
|---|---|---|---|---|
| POST | api/auth/editor/login | - | AuthEditorController@login | api |
| POST | api/auth/logout | - | Fan\FanAuthController@logout | api, ResolveTenant, Authenticate:sanctum |
| GET, HEAD | api/auth/me | - | AuthEditorController@me | api, Authenticate:sanctum |

### API - Fan Auth (2)

| Method | URI | Name | Action | Middleware |
|---|---|---|---|---|
| POST | api/auth/login | - | Fan\FanAuthController@login | api, ResolveTenant |
| POST | api/auth/register | - | Fan\FanAuthController@register | api, ResolveTenant |

### API - Platform Admin Auth (3)

| Method | URI | Name | Action | Middleware |
|---|---|---|---|---|
| POST | api/admin/auth/login | - | Admin\PlatformAdminAuthController@login | api |
| POST | api/admin/auth/logout | - | Admin\PlatformAdminAuthController@logout | api, Authenticate:sanctum, EnsureServiceAdmin |
| POST | api/admin/auth/mfa/verify | - | Admin\PlatformAdminAuthController@verifyMfa | api, Authenticate:sanctum, EnsureServiceAdmin |

### API - Platform Admin (20)

| Method | URI | Name | Action | Middleware |
|---|---|---|---|---|
| GET, HEAD | api/admin/audit-logs | - | Admin\AuditLogController@index | api, Authenticate:sanctum, EnsureServiceAdmin |
| GET, HEAD | api/admin/feature-flags | - | Admin\FeatureFlagController@index | api, Authenticate:sanctum, EnsureServiceAdmin |
| POST | api/admin/feature-flags | - | Admin\FeatureFlagController@store | api, Authenticate:sanctum, EnsureServiceAdmin |
| POST | api/admin/feature-flags/{flagId}/rollout | - | Admin\FeatureFlagController@rollout | api, Authenticate:sanctum, EnsureServiceAdmin |
| PUT | api/admin/feature-flags/{flagId}/tenants/{tenantId} | - | Admin\FeatureFlagController@setTenantOverride | api, Authenticate:sanctum, EnsureServiceAdmin |
| GET, HEAD | api/admin/plans | - | Admin\PlanController@index | api, Authenticate:sanctum, EnsureServiceAdmin |
| POST | api/admin/plans | - | Admin\PlanController@store | api, Authenticate:sanctum, EnsureServiceAdmin |
| GET, HEAD | api/admin/projects | - | AdminController@projects | api, Authenticate:sanctum, EnsureServiceAdmin |
| GET, HEAD | api/admin/stats | - | AdminController@stats | api, Authenticate:sanctum, EnsureServiceAdmin |
| GET, HEAD | api/admin/tenants | - | Admin\TenantController@index | api, Authenticate:sanctum, EnsureServiceAdmin |
| POST | api/admin/tenants | - | Admin\TenantController@store | api, Authenticate:sanctum, EnsureServiceAdmin |
| GET, HEAD | api/admin/tenants/{tenantId} | - | Admin\TenantController@show | api, Authenticate:sanctum, EnsureServiceAdmin |
| PATCH | api/admin/tenants/{tenantId} | - | Admin\TenantController@update | api, Authenticate:sanctum, EnsureServiceAdmin |
| POST | api/admin/tenants/{tenantId}/impersonate | - | Admin\TenantController@impersonate | api, Authenticate:sanctum, EnsureServiceAdmin |
| PUT | api/admin/tenants/{tenantId}/plan | - | Admin\TenantController@assignPlan | api, Authenticate:sanctum, EnsureServiceAdmin |
| POST | api/admin/tenants/{tenantId}/reactivate | - | Admin\TenantController@reactivate | api, Authenticate:sanctum, EnsureServiceAdmin |
| POST | api/admin/tenants/{tenantId}/suspend | - | Admin\TenantController@suspend | api, Authenticate:sanctum, EnsureServiceAdmin |
| GET, HEAD | api/admin/test-auth | - | Closure | api, Authenticate:sanctum |
| GET, HEAD | api/admin/test-plans | - | Closure | api |
| GET, HEAD | api/admin/users | - | AdminController@users | api, Authenticate:sanctum, EnsureServiceAdmin |

### API - Editor Projects and Publish (11)

| Method | URI | Name | Action | Middleware |
|---|---|---|---|---|
| GET, HEAD | api/projects | projects.index | ProjectController@index | api, ResolveTenant, Authenticate:sanctum |
| POST | api/projects | projects.store | ProjectController@store | api, ResolveTenant, Authenticate:sanctum |
| DELETE | api/projects/{project} | projects.destroy | ProjectController@destroy | api, ResolveTenant, Authenticate:sanctum |
| GET, HEAD | api/projects/{project} | projects.show | ProjectController@show | api, ResolveTenant, Authenticate:sanctum |
| PUT, PATCH | api/projects/{project} | projects.update | ProjectController@update | api, ResolveTenant, Authenticate:sanctum |
| POST | api/projects/{project}/compile | - | CompilerController@compile | api, ResolveTenant, Authenticate:sanctum |
| POST | api/projects/{project}/publish | - | PublishController@publish | api, ResolveTenant, Authenticate:sanctum |
| GET, HEAD | api/projects/{project}/published | - | PublishController@show | api, ResolveTenant, Authenticate:sanctum |
| GET, HEAD | api/projects/{project}/snapshots | - | SnapshotController@index | api, ResolveTenant, Authenticate:sanctum |
| POST | api/projects/{project}/snapshots | - | SnapshotController@store | api, ResolveTenant, Authenticate:sanctum |
| GET, HEAD | api/projects/{project}/snapshots/{version} | - | SnapshotController@show | api, ResolveTenant, Authenticate:sanctum |

### API - Tenant Admin Manage (19)

| Method | URI | Name | Action | Middleware |
|---|---|---|---|---|
| POST | api/manage/auth/logout | - | Manage\TenantAdminAuthController@logout | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| POST | api/manage/blog/comments/{commentId}/hide | - | Manage\BlogController@hideComment | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| GET, HEAD | api/manage/blog/posts | - | Manage\BlogController@index | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| POST | api/manage/blog/posts | - | Manage\BlogController@store | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| POST | api/manage/blog/posts/{postId}/publish | - | Manage\BlogController@publish | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| GET, HEAD | api/manage/events | - | Manage\EventController@index | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| POST | api/manage/events | - | Manage\EventController@store | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| GET, HEAD | api/manage/idol/groups | - | Manage\IdolGroupController@index | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| POST | api/manage/idol/groups | - | Manage\IdolGroupController@store | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| GET, HEAD | api/manage/idol/profile | - | Manage\IdolProfileController@show | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| PUT | api/manage/idol/profile | - | Manage\IdolProfileController@update | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| POST | api/manage/idol/social-links | - | Manage\SocialLinkController@upsert | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| GET, HEAD | api/manage/membership/tiers | - | Manage\MembershipTierController@index | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| POST | api/manage/membership/tiers | - | Manage\MembershipTierController@store | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| GET, HEAD | api/manage/merch/orders | - | Manage\MerchController@orders | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| POST | api/manage/merch/orders/{orderId}/ship | - | Manage\MerchController@ship | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| GET, HEAD | api/manage/merch/products | - | Manage\MerchController@index | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| POST | api/manage/merch/products | - | Manage\MerchController@store | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |
| PATCH | api/manage/merch/variants/{variantId}/stock | - | Manage\MerchController@updateStock | api, ResolveTenant, Authenticate:sanctum, EnsureTenantAdmin |

### API - Fan Experience (29)

| Method | URI | Name | Action | Middleware |
|---|---|---|---|---|
| GET, HEAD | api/blog/posts | - | Fan\BlogController@index | api, ResolveTenant |
| GET, HEAD | api/blog/posts/{postId} | - | Fan\BlogController@show | api, ResolveTenant |
| GET, HEAD | api/blog/posts/{postId}/comments | - | Fan\BlogController@comments | api, ResolveTenant |
| POST | api/blog/posts/{postId}/comments | - | Fan\BlogController@storeComment | api, ResolveTenant, Authenticate:sanctum |
| POST | api/blog/posts/{postId}/like | - | Fan\BlogController@like | api, ResolveTenant, Authenticate:sanctum |
| GET, HEAD | api/events | - | Fan\EventController@index | api, ResolveTenant |
| POST | api/events/{eventId}/rsvp | - | Fan\EventController@rsvp | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| POST | api/membership/subscribe | - | Fan\FanSubscriptionController@subscribe | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| GET, HEAD | api/membership/subscription | - | Fan\FanSubscriptionController@show | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| POST | api/membership/subscription/cancel | - | Fan\FanSubscriptionController@cancel | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| POST | api/membership/subscription/upgrade | - | Fan\FanSubscriptionController@upgrade | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| GET, HEAD | api/membership/tiers | - | Fan\FanSubscriptionController@tiers | api, ResolveTenant |
| GET, HEAD | api/merch/cart | - | Fan\MerchController@cart | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| POST | api/merch/cart/items | - | Fan\MerchController@addItem | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| DELETE | api/merch/cart/items/{itemId} | - | Fan\MerchController@removeItem | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| PATCH | api/merch/cart/items/{itemId} | - | Fan\MerchController@updateItem | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| POST | api/merch/checkout | - | Fan\MerchController@checkout | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| GET, HEAD | api/merch/orders | - | Fan\MerchController@orders | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| GET, HEAD | api/merch/orders/{orderId} | - | Fan\MerchController@showOrder | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| POST | api/merch/orders/{orderId}/cancel | - | Fan\MerchController@cancelOrder | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| GET, HEAD | api/merch/products | - | Fan\MerchController@products | api, ResolveTenant |
| GET, HEAD | api/notifications | - | Fan\NotificationController@index | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| GET, HEAD | api/notifications/preferences | - | Fan\NotificationController@preferences | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| PUT | api/notifications/preferences | - | Fan\NotificationController@updatePreferences | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| POST | api/notifications/read-all | - | Fan\NotificationController@readAll | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| GET, HEAD | api/profile | - | Fan\FanProfileController@show | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| PATCH | api/profile | - | Fan\FanProfileController@update | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| GET, HEAD | api/profile/addresses | - | Fan\AddressController@index | api, ResolveTenant, Authenticate:sanctum, EnsureFan |
| POST | api/profile/addresses | - | Fan\AddressController@store | api, ResolveTenant, Authenticate:sanctum, EnsureFan |

### API - Webhooks (1)

| Method | URI | Name | Action | Middleware |
|---|---|---|---|---|
| POST | api/webhooks/payment/{provider} | - | PaymentWebhookController@handle | api |

### API - Test and Diagnostics (1)

| Method | URI | Name | Action | Middleware |
|---|---|---|---|---|
| GET, HEAD | api/tenant-test | - | Closure | api, ResolveTenant |

## Notes

- `api/auth/logout` appears under fan auth in route definitions, while editor logout is available at `api/auth/logout` under the protected editor auth group as well. Confirm intended audience and token type at runtime.
- Diagnostic routes (`api/admin/test-plans`, `api/admin/test-auth`, `api/tenant-test`) are included because they are registered in route files. Remove or guard more tightly for production if needed.
