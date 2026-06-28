<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BlogPostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'title'           => $this->title,
            'content'         => $this->content,
            'cover_image_url' => $this->cover_image_url,
            'tags'            => $this->tags ?? [],
            'status'          => $this->status,
            'visibility'      => $this->visibility,
            'category'        => new BlogCategoryResource($this->whenLoaded('category')),
            'like_count'      => $this->like_count,
            'comment_count'   => $this->comment_count,
            'published_at'    => $this->published_at,
            'created_at'      => $this->created_at,
            'updated_at'      => $this->updated_at,
        ];
    }
}
