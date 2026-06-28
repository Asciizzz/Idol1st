<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MerchProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'name'               => $this->name,
            'description'        => $this->description,
            'base_price'         => $this->base_price,
            'currency'           => $this->currency,
            'cover_image_url'    => $this->cover_image_url,
            'images'             => $this->images ?? [],
            'status'             => $this->status,
            'is_limited_edition' => $this->is_limited_edition,
            'available_from'     => $this->available_from,
            'available_until'    => $this->available_until,
            'category'           => new MerchCategoryResource($this->whenLoaded('category')),
            'variants'           => MerchVariantResource::collection($this->whenLoaded('variants')),
        ];
    }
}
