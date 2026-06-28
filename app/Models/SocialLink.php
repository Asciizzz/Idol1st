<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialLink extends Model
{
    use HasUuids;

    protected $fillable = [
        'idol_profile_id',
        'platform',
        'url',
        'follower_count',
        'last_synced_at',
    ];

    protected $casts = [
        'follower_count' => 'integer',
        'last_synced_at' => 'datetime',
    ];

    public function idolProfile(): BelongsTo
    {
        return $this->belongsTo(IdolProfile::class);
    }
}
