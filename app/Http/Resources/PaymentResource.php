<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'amount'         => $this->amount,
            'currency'       => $this->currency,
            'status'         => $this->status,
            'method'         => $this->method,
            'transaction_id' => $this->transaction_id,
            'paid_at'        => $this->paid_at,
        ];
    }
}
