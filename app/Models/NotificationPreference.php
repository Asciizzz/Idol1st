<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    protected $fillable = [
        'fan_id',
        'type',
        'is_enabled',
        'channel',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
    ];

    public function fan(): BelongsTo
    {
        return $this->belongsTo(Fan::class);
    }
}
