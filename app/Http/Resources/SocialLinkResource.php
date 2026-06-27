<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SocialLinkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'platform'       => $this->platform,
            'url'            => $this->url,
            'follower_count' => $this->follower_count,
            'last_synced_at' => $this->last_synced_at,
        ];
    }
}
