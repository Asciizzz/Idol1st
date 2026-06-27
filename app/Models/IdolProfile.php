<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IdolProfile extends Model
{
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'stage_name',
        'bio',
        'debut_date',
        'agency',
        'nationality',
        'profile_image_url',
        'banner_image_url',
        'status',
    ];

    protected $casts = [
        'debut_date' => 'date',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function socialLinks(): HasMany
    {
        return $this->hasMany(SocialLink::class);
    }

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(IdolGroup::class, 'idol_group_members', 'idol_profile_id', 'group_id');
    }
}
