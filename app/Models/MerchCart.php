<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MerchCart extends Model
{
    use HasUuids;

    protected $fillable = ['fan_id', 'tenant_id'];

    public function fan(): BelongsTo
    {
        return $this->belongsTo(Fan::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(MerchCartItem::class, 'cart_id');
    }

    public function getSubtotalAttribute(): float
    {
        return $this->items->sum(fn ($item) => $item->unit_price * $item->quantity);
    }

    public function getTotalAttribute(): float
    {
        // Same as subtotal for now — extend here for discounts/taxes
        return $this->subtotal;
    }
}
