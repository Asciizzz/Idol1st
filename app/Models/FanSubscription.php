<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FanSubscription extends Model
{
    use HasUuids;

    protected $fillable = [
        'fan_id',
        'tier_id',
        'start_date',
        'end_date',
        'status',
        'auto_renew',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date'   => 'datetime',
        'auto_renew' => 'boolean',
    ];

    public function fan(): BelongsTo
    {
        return $this->belongsTo(Fan::class);
    }

    public function tier(): BelongsTo
    {
        return $this->belongsTo(MembershipTier::class, 'tier_id');
    }
}
