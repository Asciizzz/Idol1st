<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlogComment extends Model
{
    use HasUuids;

    protected $fillable = [
        'post_id',
        'fan_id',
        'content',
        'is_hidden',
    ];

    protected $casts = [
        'is_hidden' => 'boolean',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(BlogPost::class, 'post_id');
    }

    public function fan(): BelongsTo
    {
        return $this->belongsTo(Fan::class);
    }
}
