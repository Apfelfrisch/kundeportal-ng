<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Integrations\CustomerDataApi\Data\PaymentPlanData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * KVS delivers the plan `amount` in euro cents (the old
 * Contract::formattedAmount() divided by 100 for display).
 */
final class PaymentPlanResource extends JsonResource
{
    public function __construct(
        private readonly PaymentPlanData $paymentPlan,
    ) {
        parent::__construct($paymentPlan);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'amount_cents' => $this->paymentPlan->amount,
            'valid_from' => $this->paymentPlan->validFrom?->toDateString(),
            'valid_until' => $this->paymentPlan->validUntil?->toDateString(),
            'next_payment' => $this->paymentPlan->nextPayment?->toDateString(),
            'type' => $this->paymentPlan->type,
        ];
    }
}
