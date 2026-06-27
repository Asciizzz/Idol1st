<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceAdminResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'email'         => $this->email,
            'role'          => $this->role,
            'mfa_enabled'   => $this->mfa_enabled,
            'is_active'     => $this->is_active,
            'last_login_at' => $this->last_login_at,
            'created_at'    => $this->created_at,
        ];
    }
}
