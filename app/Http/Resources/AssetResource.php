<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'user_id'    => $this->user_id,
            'project_id' => $this->project_id,
            'type'       => $this->type,
            'filename'   => $this->filename,
            'url'        => $this->url,         // computed via getUrlAttribute()
            'mime_type'  => $this->mime_type,
            'size'       => $this->size,
            'created_at' => $this->created_at,
        ];
    }
}
