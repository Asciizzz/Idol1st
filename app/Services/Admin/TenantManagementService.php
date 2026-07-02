<?php

namespace App\Services\Admin;

use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TenantManagementService
{
    public function createTenant(string $name, string $planId, ?int $createdById = null): Tenant
    {
        return DB::transaction(function () use ($name, $planId, $createdById) {
            $tenant = Tenant::create([
                'id'         => Str::uuid(),
                'name'       => $name,
                'status'     => 'ACTIVE',
                'created_by' => $createdById,
                'config'     => [
                    'branding_logo'   => null,
                    'branding_colors' => null,
                    'custom_domain'   => null,
                    'settings'        => [],
                ],
            ]);

            TenantSubscription::create([
                'id'        => Str::uuid(),
                'tenant_id' => $tenant->id,
                'plan_id'   => $planId,
                'status'    => 'ACTIVE',
            ]);

            return $tenant->load('subscription.plan');
        });
    }

    public function updateTenant(string $tenantId, array $data): Tenant
    {
        $tenant = Tenant::findOrFail($tenantId);
        $tenant->update($data);

        return $tenant->fresh('subscription.plan');
    }

    public function suspendTenant(string $tenantId, string $reason): Tenant
    {
        $tenant = Tenant::findOrFail($tenantId);

        if ($tenant->isSuspended()) {
            throw new \RuntimeException('Tenant is already suspended.');
        }

        $tenant->update([
            'status'            => 'SUSPENDED',
            'suspended_at'      => now(),
            'suspension_reason' => $reason,
        ]);

        return $tenant->fresh('subscription.plan');
    }

    public function reactivateTenant(string $tenantId): Tenant
    {
        $tenant = Tenant::findOrFail($tenantId);

        if ($tenant->isActive()) {
            throw new \RuntimeException('Tenant is already active.');
        }

        $tenant->update([
            'status'            => 'ACTIVE',
            'suspended_at'      => null,
            'suspension_reason' => null,
        ]);

        return $tenant->fresh('subscription.plan');
    }

    public function assignPlan(string $tenantId, string $planId): Plan
    {
        $tenant = Tenant::findOrFail($tenantId);
        $plan   = Plan::findOrFail($planId);

        DB::transaction(function () use ($tenant, $plan) {
            $tenant->subscriptions()
                ->where('status', 'ACTIVE')
                ->update(['status' => 'CANCELLED']);

            TenantSubscription::create([
                'id'        => Str::uuid(),
                'tenant_id' => $tenant->id,
                'plan_id'   => $plan->id,
                'status'    => 'ACTIVE',
            ]);
        });

        return $plan;
    }
}
