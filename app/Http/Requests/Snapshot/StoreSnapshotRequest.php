<?php

namespace App\Http\Requests\Snapshot;

use Illuminate\Foundation\Http\FormRequest;

class StoreSnapshotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // ownership enforced in controller via ProjectPolicy
    }

    public function rules(): array
    {
        return [
            // graph_data is the full serialized VsGraph JSON string from the frontend.
            // Accept it as either a pre-encoded string or a raw object/array —
            // we normalize to a JSON string in the controller before storing.
            'graph_data'    => ['required'],

            // compiled_* fields are optional here; CompilerController (Step 4)
            // will always provide them. Direct snapshot saves from the editor
            // may omit compiled output and just save graph state.
            'compiled_html' => ['sometimes', 'nullable', 'string'],
            'compiled_css'  => ['sometimes', 'nullable', 'string'],
            'compiled_js'   => ['sometimes', 'nullable', 'string'],
        ];
    }
}
