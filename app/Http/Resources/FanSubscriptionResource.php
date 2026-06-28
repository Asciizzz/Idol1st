<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FanSubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'tier'       => new MembershipTierResource($this->whenLoaded('tier')),
            'start_date' => $this->start_date,
            'end_date'   => $this->end_date,
            'status'     => $this->status,
            'auto_renew' => $this->auto_renew,
        ];
    }
}
