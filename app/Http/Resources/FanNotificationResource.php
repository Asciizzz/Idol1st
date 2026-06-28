<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FanNotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'type'           => $this->type,
            'message'        => $this->message,
            'is_read'        => $this->is_read,
            'reference_id'   => $this->reference_id,
            'reference_type' => $this->reference_type,
            'created_at'     => $this->created_at,
        ];
    }
}
