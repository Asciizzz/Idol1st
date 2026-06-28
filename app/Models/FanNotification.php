<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FanNotification extends Model
{
    use HasUuids;

    public $timestamps  = false;
    public $incrementing = false;

    protected $fillable = [
        'id',
        'fan_id',
        'type',
        'message',
        'is_read',
        'reference_id',
        'reference_type',
        'created_at',
    ];

    protected $casts = [
        'is_read'    => 'boolean',
        'created_at' => 'datetime',
    ];

    public function fan(): BelongsTo
    {
        return $this->belongsTo(Fan::class);
    }
}
