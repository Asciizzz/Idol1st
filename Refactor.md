# Idol1st Multi-Tenant Refactor Documentation

## Overview

The original architecture had two separate authentication systems:

1. Editor authentication:

* Model: `User`
* Table: `users`
* Used by the editor interface
* Token generated through Sanctum
* Used for:

  * `/api/projects`
  * `/api/auth/me`
  * editor operations

2. Tenant Admin authentication:

* Model: `TenantAdmin`
* Table: `tenant_admins`
* Separate login system
* Used for:

  * `/api/manage/*`

This created two unrelated authentication flows on the same editor screen.

The goal was to simplify the architecture:

Old:

```
User
 |
 Editor


TenantAdmin
 |
 Tenant Management
```

New:

```
Tenant
 |
 Users
 |
 +----------------+
 |                |
Editor User   Tenant Admin User
(Sanctum)     (same Sanctum system)
```

---

# 1. Database Changes

## Added tenant ownership to users

The `users` table now contains:

```
tenant_id
is_tenant_admin
```

Example:

```
users

id: 3
name: Sakura Admin
email: admin@sakura.com
tenant_id: 019f1474-81f1-70be-abbe-d2036e36f077
role: admin
is_tenant_admin: true
```

This allows a normal user account to act as the tenant administrator.

---

## Removed TenantAdmin table

The old table:

```
tenant_admins
```

was removed.

Authentication now uses:

```
users
```

only.

---

## Added tenant slug

The `tenants` table now contains:

```
slug
```

Example:

```
id:
019f1474-81f1-70be-abbe-d2036e36f077

slug:
sakura

name:
Sakura Fan Site
```

This is used for subdomain routing:

```
sakura.idol1st.com
```

---

## Added tenant_id to projects

Projects now belong to tenants:

```
projects

id
user_id
tenant_id
name
slug
status
```

Relationship:

```
Tenant
 |
 Projects
 |
 User
```

---

# 2. Tenant Resolution

Old method:

```
X-Tenant-ID header
```

Example:

```
X-Tenant-ID:
019f1474...
```

Problem:

* Manual
* Easy to misuse
* Not user friendly

---

New method:

Subdomain based:

```
sakura.idol1st.com
```

The middleware:

```
ResolveTenant
```

detects the tenant.

Flow:

```
Request

   |
   v

ResolveTenant

   |
   v

Find Tenant by slug

   |
   v

$request->tenant()

```

The tenant is then available everywhere.

Example:

```php
$request->tenant()
```

---

# 3. Project Tenant Isolation

The `Project` model now has a tenant relationship:

```php
public function tenant()
{
    return $this->belongsTo(Tenant::class);
}
```

A global scope was added:

```php
tenant_id = current tenant
```

Meaning:

When Sakura logs in:

```sql
SELECT *
FROM projects
WHERE tenant_id = sakura
```

Only Sakura projects appear.

---

# 4. Project Authorization Changes

Old:

```
User owns project
```

Example:

```php
$user->id === $project->user_id
```

New:

```
User belongs to tenant
AND
Project belongs to same tenant
```

Example:

```php
$user->tenant_id === $project->tenant_id
```

This allows multiple editors inside one tenant.

---

# 5. Authentication Changes

Old:

```
TenantAdmin login

/api/manage/auth/login

creates TenantAdmin token
```

New:

```
User login

/api/auth/login

creates User token
```

The editor now uses:

```
users table
Sanctum token
```

only.

---

# 6. User Resource Update

The API user response now includes:

```json
{
"id":3,
"name":"Sakura Admin",
"email":"admin@sakura.com",
"role":"admin",
"is_tenant_admin":true,
"tenant_id":"019f1474..."
}
```

This allows frontend systems to know the current tenant.

---

# 7. Model Relationships

## Tenant

Added:

```php
users()
```

Relationship:

```
Tenant
 |
 hasMany
 |
 Users
```

---

## User

Added:

```php
tenant()
```

Relationship:

```
User
 |
 belongsTo
 |
Tenant
```

---

## Project

Relationships:

```
Project
 |
 belongsTo Tenant

Project
 |
 belongsTo User

Project
 |
 hasMany Snapshots

Project
 |
 hasMany Assets

Project
 |
 hasMany PublishedSites
```

---

# 8. Snapshot Changes

Snapshots remain attached through projects.

Flow:

```
Tenant

 |
 Project

 |
 Snapshot
```

Version generation changed from:

```php
nextVersion($projectId)
```

to:

```php
nextVersion(Project $project)
```

This keeps tenant context.

---

# 9. Asset Changes

Assets remain project-owned.

Storage changed from:

Old:

```
assets/user_id/image
```

New:

```
assets/
 |
 tenant_id/
 |
 user_id/
 |
 image
```

This separates tenant files.

---

# 10. Route Structure

Final editor API structure:

```
resolve.tenant
        |
auth:sanctum
        |
Controllers
```

Protected routes:

```
GET    /api/projects

POST   /api/projects

GET    /api/projects/{id}

POST   /api/projects/{id}/snapshots

GET    /api/projects/{id}/snapshots

POST   /api/projects/{id}/publish

GET    /api/projects/{id}/published
```

---

# Final Architecture

```
                Tenant
                  |
        -------------------
        |                 |
      Users              Fans
        |
        |
  ----------------
  |              |
Editor        Tenant Admin
Token         Token

        |
        |
     Projects

        |
 -------------------
 |        |         |
Assets Snapshots Published Sites

```

---

# Completed Goals

Completed:

✓ Removed duplicate TenantAdmin authentication
✓ Merged tenant admin into User
✓ Added tenant ownership to users
✓ Added tenant ownership to projects
✓ Removed X-Tenant-ID dependency
✓ Added subdomain tenant resolution
✓ Added tenant-aware authorization
✓ Protected editor resources by tenant
✓ Prepared public fan-facing tenant routing

Remaining future work:

* Public fan site controller
* Published site resolver by domain/subdomain
* Tenant onboarding flow
* Tenant custom domains
* Billing integration
* Tenant settings management
