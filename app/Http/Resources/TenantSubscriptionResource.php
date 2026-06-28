<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenantSubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'plan'       => new PlanResource($this->whenLoaded('plan')),
            'start_date' => $this->start_date,
            'end_date'   => $this->end_date,
            'status'     => $this->status,
        ];
    }
}
