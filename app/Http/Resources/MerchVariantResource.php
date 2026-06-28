<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MerchVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'sku'           => $this->sku,
            'attributes'    => $this->attributes,
            'price'         => $this->price,
            'stock_qty'     => $this->stock_qty,
            'available_qty' => $this->available_qty,
        ];
    }
}
