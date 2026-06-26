<?php

namespace App\Http\Requests\Compiler;

use Illuminate\Foundation\Http\FormRequest;

class CompileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // ownership enforced in controller via ProjectPolicy
    }

    public function rules(): array
    {
        return [
            // Full serialized VsGraph JSON — required for compile
            'graph_data'    => ['required'],

            // All three compiled outputs are required on compile
            // (unlike a raw snapshot save where they're optional)
            'compiled_html' => ['required', 'string'],
            'compiled_css'  => ['required', 'string'],
            'compiled_js'   => ['required', 'string'],
        ];
    }
}
