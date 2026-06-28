<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class IdolGroup extends Model
{
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'group_name',
        'debut_date',
        'agency',
        'bio',
        'profile_image_url',
    ];

    protected $casts = [
        'debut_date' => 'date',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(IdolProfile::class, 'idol_group_members', 'group_id', 'idol_profile_id');
    }
}
