<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class FeatureFlag extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'is_globally_enabled',
    ];

    protected $casts = [
        'is_globally_enabled' => 'boolean',
    ];

    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'feature_flag_tenant', 'flag_id', 'tenant_id')
                    ->withPivot('is_enabled')
                    ->withTimestamps();
    }
}
