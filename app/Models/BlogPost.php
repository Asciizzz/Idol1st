<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BlogPost extends Model
{
    use BelongsToTenant;
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'category_id',
        'title',
        'content',
        'cover_image_url',
        'tags',
        'status',
        'visibility',
        'published_at',
    ];

    protected $casts = [
        'tags'         => 'array',
        'published_at' => 'datetime',
    ];

    protected $appends = ['like_count', 'comment_count'];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(BlogCategory::class, 'category_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(BlogComment::class, 'post_id');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(BlogPostLike::class, 'post_id');
    }

    public function getLikeCountAttribute(): int
    {
        return $this->likes()->count();
    }

    public function getCommentCountAttribute(): int
    {
        return $this->comments()->where('is_hidden', false)->count();
    }
}
