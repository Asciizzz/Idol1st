<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlogPostLike extends Model
{
    public $timestamps  = false;
    public $incrementing = false;

    protected $fillable = ['post_id', 'fan_id'];

    public function post(): BelongsTo
    {
        return $this->belongsTo(BlogPost::class, 'post_id');
    }

    public function fan(): BelongsTo
    {
        return $this->belongsTo(Fan::class);
    }
}
