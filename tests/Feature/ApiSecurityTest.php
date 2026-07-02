<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolve_tenant_rejects_reserved_hosts(): void
    {
        $this->withHeaders(['Host' => 'localhost'])
            ->getJson('/api/blog/posts')
            ->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Tenant context required (subdomain or tenant-linked token).',
            ]);
    }

    public function test_resolve_tenant_accepts_token_bound_tenant_on_reserved_host(): void
    {
        $tenant = Tenant::create([
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
            'status' => 'ACTIVE',
            'config' => [],
        ]);

        $user = User::create([
            'name' => 'Editor User',
            'email' => 'editor@example.test',
            'password' => 'secret',
            'tenant_id' => $tenant->id,
            'role' => 'EDITOR',
            'is_tenant_admin' => false,
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        $this->withHeaders([
                'Host' => 'localhost',
                'Authorization' => 'Bearer ' . $token,
            ])
            ->getJson('/api/projects')
            ->assertOk()
            ->assertJsonStructure([
                'data',
                'links',
                'meta',
            ]);
    }

    public function test_admin_routes_reject_non_service_admin_tokens(): void
    {
        $tenant = Tenant::create([
            'name' => 'Tenant Admin Check',
            'slug' => 'tenant-admin-check',
            'status' => 'ACTIVE',
            'config' => [],
        ]);

        $user = User::create([
            'name' => 'Tenant Admin',
            'email' => 'tenant-admin@example.test',
            'password' => 'secret',
            'tenant_id' => $tenant->id,
            'role' => 'EDITOR',
            'is_tenant_admin' => true,
        ]);

        $token = $user->createToken('tenant-admin-token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/admin/users')
            ->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Forbidden. Service admin access required.',
            ]);
    }
}
