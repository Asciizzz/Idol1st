<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AuditLog extends Model
{
    use HasUuids;

    public $timestamps  = false;
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'admin_id',
        'action',
        'target_entity',
        'target_id',
        'performed_at',
    ];

    protected $casts = [
        'performed_at' => 'datetime',
    ];

    /**
     * Convenience method to write an audit entry from anywhere in the app.
     *
     * Usage:
     *   AuditLog::record('TENANT_SUSPENDED', 'Tenant', $tenant->id, $tenant->id, $admin->id);
     */
    public static function record(
        string $action,
        string $targetEntity,
        ?string $targetId = null,
        ?string $tenantId = null,
        ?string $adminId  = null,
    ): self {
        return static::create([
            'id'            => Str::uuid(),
            'tenant_id'     => $tenantId,
            'admin_id'      => $adminId ?? auth()->id(),
            'action'        => $action,
            'target_entity' => $targetEntity,
            'target_id'     => $targetId,
            'performed_at'  => now(),
        ]);
    }
}
