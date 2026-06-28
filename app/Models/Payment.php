<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasUuids;

    protected $fillable = [
        'order_id', 'subscription_id', 'amount', 'currency',
        'status', 'method', 'transaction_id', 'transfer_network', 'paid_at',
    ];

    protected $casts = [
        'amount'  => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(MerchOrder::class, 'order_id');
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(FanSubscription::class, 'subscription_id');
    }
}
