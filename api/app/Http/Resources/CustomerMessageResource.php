<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CustomerMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class CustomerMessageResource extends JsonResource
{
    public function __construct(
        private readonly CustomerMessage $message,
    ) {
        parent::__construct($message);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->message->id,
            'form_type' => $this->message->form_type,
            'contract_number' => $this->message->contract_number,
            'status' => $this->message->status->value,
            'data' => $this->message->data,
            'created_at' => $this->message->created_at?->toIso8601String(),
        ];
    }
}
