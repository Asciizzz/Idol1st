<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Fan extends Authenticatable
{
    use BelongsToTenant, HasApiTokens, HasUuids;

    protected $fillable = [
        'tenant_id',
        'email',
        'username',
        'display_name',
        'avatar_url',
        'password',
    ];

    protected $hidden = ['password'];

    // ── Relationships ─────────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(FanSubscription::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(FanSubscription::class)
            ->where('status', 'ACTIVE')
            ->latestOfMany();
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    // ── Helpers ───────────────────────────────────────────────

    public function activeSubscription(): ?FanSubscription
    {
        return $this->subscription;
    }

    public function hasActiveSubscription(): bool
    {
        return FanSubscription::where('fan_id', $this->id)
            ->where('status', 'ACTIVE')
            ->exists();
    }
}
