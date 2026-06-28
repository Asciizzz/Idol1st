<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Laravel\Sanctum\HasApiTokens;

class TenantAdmin extends Authenticatable
{
    use HasApiTokens, HasUuids;

    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
