<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SnapshotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'project_id'    => $this->project_id,
            'version'       => $this->version,
            // Return graph_data as a decoded object so the frontend
            // receives it as JSON rather than a double-encoded string.
            'graph_data'    => json_decode($this->graph_data),
            'compiled_html' => $this->compiled_html,
            'compiled_css'  => $this->compiled_css,
            'compiled_js'   => $this->compiled_js,
            'created_at'    => $this->created_at,
        ];
    }
}
