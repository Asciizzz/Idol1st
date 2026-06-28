<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Shipment extends Model
{
    use HasUuids;

    protected $fillable = [
        'order_id', 'tracking_number', 'carrier',
        'status', 'shipped_at', 'estimated_delivery',
    ];

    protected $casts = [
        'shipped_at'         => 'datetime',
        'estimated_delivery' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(MerchOrder::class, 'order_id');
    }
}
