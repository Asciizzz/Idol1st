<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'email'        => $this->email,
            'username'     => $this->username,
            'display_name' => $this->display_name,
            'avatar_url'   => $this->avatar_url,
            'created_at'   => $this->created_at,
            'subscription' => new FanSubscriptionResource($this->whenLoaded('subscription')),
        ];
    }
}
