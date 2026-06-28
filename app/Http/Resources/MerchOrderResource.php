<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MerchOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'fan_id'           => $this->fan_id,
            'total_amount'     => $this->total_amount,
            'currency'         => $this->currency,
            'status'           => $this->status,
            'placed_at'        => $this->placed_at,
            'shipping_address' => [
                'street'      => $this->shipping_street,
                'city'        => $this->shipping_city,
                'state'       => $this->shipping_state,
                'country'     => $this->shipping_country,
                'postal_code' => $this->shipping_postal_code,
            ],
            'items'    => MerchOrderItemResource::collection($this->whenLoaded('items')),
            'payment'  => new PaymentResource($this->whenLoaded('payment')),
            'shipment' => new ShipmentResource($this->whenLoaded('shipment')),
        ];
    }
}
