<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BlogCommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'fan_id'     => $this->fan_id,
            'content'    => $this->content,
            'is_hidden'  => $this->is_hidden,
            'created_at' => $this->created_at,
        ];
    }
}
