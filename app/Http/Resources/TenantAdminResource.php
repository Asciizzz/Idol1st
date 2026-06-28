<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenantAdminResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'tenant_id'  => $this->tenant_id,
            'name'       => $this->name,
            'email'      => $this->email,
            'created_at' => $this->created_at,
        ];
    }
}
