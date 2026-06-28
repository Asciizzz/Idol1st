<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchCartItem extends Model
{
    use HasUuids;

    protected $fillable = ['cart_id', 'product_id', 'variant_id', 'quantity', 'unit_price'];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'quantity'   => 'integer',
    ];

    protected $appends = ['subtotal'];

    public function cart(): BelongsTo
    {
        return $this->belongsTo(MerchCart::class, 'cart_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(MerchProduct::class, 'product_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(MerchVariant::class, 'variant_id');
    }

    public function getSubtotalAttribute(): float
    {
        return $this->unit_price * $this->quantity;
    }
}
