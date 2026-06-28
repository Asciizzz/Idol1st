<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class MerchOrder extends Model
{
    use HasUuids;

    protected $fillable = [
        'fan_id', 'tenant_id', 'shipping_address_id',
        'shipping_street', 'shipping_city', 'shipping_state',
        'shipping_country', 'shipping_postal_code',
        'total_amount', 'currency', 'status', 'placed_at',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'placed_at'    => 'datetime',
    ];

    public function fan(): BelongsTo
    {
        return $this->belongsTo(Fan::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(MerchOrderItem::class, 'order_id');
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class, 'order_id');
    }

    public function shipment(): HasOne
    {
        return $this->hasOne(Shipment::class, 'order_id');
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, ['PENDING', 'PAID']);
    }
}
