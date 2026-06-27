<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'status'       => $this->status,
            'created_by'   => $this->created_by,
            'config'       => $this->config,
            'suspended_at' => $this->suspended_at,
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
            'subscription' => new TenantSubscriptionResource(
                $this->whenLoaded('subscription')
            ),
        ];
    }
}
