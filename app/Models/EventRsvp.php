<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventRsvp extends Model
{
    use HasUuids;

    protected $fillable = [
        'event_id',
        'fan_id',
        'status',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(IdolEvent::class, 'event_id');
    }

    public function fan(): BelongsTo
    {
        return $this->belongsTo(Fan::class);
    }
}
