<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IdolEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'title'          => $this->title,
            'description'    => $this->description,
            'event_type'     => $this->event_type,
            'start_datetime' => $this->start_datetime,
            'end_datetime'   => $this->end_datetime,
            'location'       => $this->location,
            'ticket_url'     => $this->ticket_url,
            'visibility'     => $this->visibility,
            'status'         => $this->status,
            'rsvp_counts'    => $this->rsvp_counts,
            'created_at'     => $this->created_at,
        ];
    }
}
