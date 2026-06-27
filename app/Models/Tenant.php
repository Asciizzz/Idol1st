<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Tenant extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'status',
        'created_by',
        'config',
        'suspended_at',
        'suspension_reason',
    ];

    protected $casts = [
        'config'       => 'array',
        'suspended_at' => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────

    public function subscription(): HasOne
    {
        return $this->hasOne(TenantSubscription::class)->latestOfMany();
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(TenantSubscription::class);
    }

    // ── Helpers ───────────────────────────────────────────────

    public function isSuspended(): bool
    {
        return $this->status === 'SUSPENDED';
    }

    public function isActive(): bool
    {
        return $this->status === 'ACTIVE';
    }
}
