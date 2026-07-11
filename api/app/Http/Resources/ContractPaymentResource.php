<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Integrations\CustomerDataApi\Data\ContractPaymentData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ContractPaymentResource extends JsonResource
{
    public function __construct(
        private readonly ContractPaymentData $contractPayment,
    ) {
        parent::__construct($contractPayment);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->contractPayment->id,
            'booking_date' => $this->contractPayment->bookingDate?->toDateString(),
            'incoming_payment' => $this->contractPayment->incomingPayment,
            'outgoing_payment' => $this->contractPayment->outgoingPayment,
            'counter_account' => $this->contractPayment->counterAccount,
        ];
    }
}
