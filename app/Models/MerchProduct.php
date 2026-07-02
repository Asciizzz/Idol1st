<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MerchProduct extends Model
{
    use BelongsToTenant;
    use HasUuids;

    protected $fillable = [
        'tenant_id', 'category_id', 'name', 'description',
        'base_price', 'currency', 'cover_image_url', 'images',
        'status', 'is_limited_edition', 'available_from', 'available_until',
    ];

    protected $casts = [
        'images'             => 'array',
        'base_price'         => 'decimal:2',
        'is_limited_edition' => 'boolean',
        'available_from'     => 'datetime',
        'available_until'    => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(MerchCategory::class, 'category_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(MerchVariant::class, 'product_id');
    }

    public function isAvailable(): bool
    {
        if ($this->status !== 'ACTIVE') return false;
        if ($this->available_from && now()->lt($this->available_from)) return false;
        if ($this->available_until && now()->gt($this->available_until)) return false;
        return true;
    }
}
