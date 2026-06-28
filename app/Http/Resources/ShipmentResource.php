<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Request;

class ShipmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'tracking_number'   => $this->tracking_number,
            'carrier'           => $this->carrier,
            'status'            => $this->status,
            'shipped_at'        => $this->shipped_at,
            'estimated_delivery'=> $this->estimated_delivery,
        ];
    }
}
