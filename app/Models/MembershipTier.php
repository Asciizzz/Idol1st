<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MembershipTier extends Model
{
    use BelongsToTenant;
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'name',
        'price',
        'billing_cycle',
        'max_members',
        'is_active',
    ];

    protected $casts = [
        'price'      => 'decimal:2',
        'is_active'  => 'boolean',
        'max_members'=> 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function perks(): HasMany
    {
        return $this->hasMany(TierPerk::class, 'tier_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(FanSubscription::class, 'tier_id');
    }

    public function activeSubscribersCount(): int
    {
        return $this->subscriptions()->where('status', 'ACTIVE')->count();
    }

    public function hasCapacity(): bool
    {
        if (! $this->max_members) return true;
        return $this->activeSubscribersCount() < $this->max_members;
    }
}
