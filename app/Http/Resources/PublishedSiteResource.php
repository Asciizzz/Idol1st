<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublishedSiteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'project_id'   => $this->project_id,
            'snapshot_id'  => $this->snapshot_id,
            'snapshot_version' => $this->snapshot?->version,
            'domain'       => $this->domain,
            'published_at' => $this->published_at,
        ];
    }
}
