<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IdolGroupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'group_name'        => $this->group_name,
            'debut_date'        => $this->debut_date,
            'agency'            => $this->agency,
            'bio'               => $this->bio,
            'profile_image_url' => $this->profile_image_url,
            'members'           => IdolProfileResource::collection($this->whenLoaded('members')),
            'created_at'        => $this->created_at,
        ];
    }
}
