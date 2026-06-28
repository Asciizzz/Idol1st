<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    use HasUuids;

    protected $fillable = [
        'fan_id', 'street', 'city', 'state', 'country', 'postal_code', 'is_default',
    ];

    protected $casts = ['is_default' => 'boolean'];

    public function fan(): BelongsTo
    {
        return $this->belongsTo(Fan::class);
    }
}
