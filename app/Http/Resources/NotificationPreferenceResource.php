<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationPreferenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type'       => $this->type,
            'is_enabled' => $this->is_enabled,
            'channel'    => $this->channel,
        ];
    }
}
