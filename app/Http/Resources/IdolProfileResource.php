<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IdolProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'tenant_id'         => $this->tenant_id,
            'stage_name'        => $this->stage_name,
            'bio'               => $this->bio,
            'debut_date'        => $this->debut_date,
            'agency'            => $this->agency,
            'nationality'       => $this->nationality,
            'profile_image_url' => $this->profile_image_url,
            'banner_image_url'  => $this->banner_image_url,
            'status'            => $this->status,
            'social_links'      => SocialLinkResource::collection($this->whenLoaded('socialLinks')),
            'created_at'        => $this->created_at,
            'updated_at'        => $this->updated_at,
        ];
    }
}
