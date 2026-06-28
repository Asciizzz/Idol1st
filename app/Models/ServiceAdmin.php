<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class ServiceAdmin extends Authenticatable
{
    use HasApiTokens, HasUuids;

    protected $fillable = [
        'email',
        'password',
        'role',
        'mfa_enabled',
        'mfa_secret',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'mfa_secret',
    ];

    protected $casts = [
        'mfa_enabled'   => 'boolean',
        'is_active'     => 'boolean',
        'last_login_at' => 'datetime',
    ];
}
