<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchVariant extends Model
{
    use HasUuids;

    protected $fillable = [
        'product_id', 'sku', 'attributes', 'price', 'stock_qty', 'available_qty',
    ];

    protected $casts = [
        'attributes'    => 'array',
        'price'         => 'decimal:2',
        'stock_qty'     => 'integer',
        'available_qty' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(MerchProduct::class, 'product_id');
    }

    public function hasStock(int $qty = 1): bool
    {
        return $this->available_qty >= $qty;
    }
}
