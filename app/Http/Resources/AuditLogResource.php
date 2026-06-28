<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'tenant_id'     => $this->tenant_id,
            'admin_id'      => $this->admin_id,
            'action'        => $this->action,
            'target_entity' => $this->target_entity,
            'target_id'     => $this->target_id,
            'performed_at'  => $this->performed_at,
        ];
    }
}
