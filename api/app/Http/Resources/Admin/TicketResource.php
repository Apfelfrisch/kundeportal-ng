<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\CustomerMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Ticket (CustomerMessage) row of the admin inbox. The status travels as the
 * API level string (open|in_process|processed) plus its German label.
 */
final class TicketResource extends JsonResource
{
    public function __construct(
        private readonly CustomerMessage $ticket,
    ) {
        parent::__construct($ticket);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $customer = $this->ticket->user;
        $caseworker = $this->ticket->caseWorker;

        return [
            'id' => $this->ticket->id,
            'form_type' => $this->ticket->form_type,
            'contract_number' => $this->ticket->contract_number,
            'data' => $this->ticket->data,
            'status' => [
                'value' => $this->ticket->status->apiStatus(),
                'label' => $this->ticket->status->label(),
            ],
            'customer' => $customer === null ? null : [
                'id' => $customer->id,
                'customer_number' => $customer->customer_number,
                'name' => $customer->name,
                'email' => $customer->email,
            ],
            'caseworker' => $caseworker === null ? null : [
                'id' => $caseworker->id,
                'name' => $caseworker->name,
            ],
            'created_at' => $this->ticket->created_at?->toISOString(),
        ];
    }
}
