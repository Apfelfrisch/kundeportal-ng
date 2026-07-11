<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\ContractStatus;
use App\Integrations\CustomerDataApi\Data\ContractData;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Contract list entry for the customer area — the fields of the old
 * customer/contracts.blade.php cards and contracts-table.blade.php.
 */
final class ContractSummaryResource extends JsonResource
{
    public function __construct(
        private readonly ContractData $contract,
    ) {
        parent::__construct($contract);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $meterPoint = $this->contract->latestMeterPoint();

        return [
            'contract_number' => $this->contract->contractNumber,
            'status' => [
                'id' => (int) $this->contract->status,
                'label' => ContractStatus::fromKvsId($this->contract->status)->value,
            ],
            'tariff' => $this->contract->tariff,
            'delivery_address' => $meterPoint === null ? null : [
                'zip' => $meterPoint->zip,
                'city' => $meterPoint->city,
                'street' => $meterPoint->street,
                'street_number' => $meterPoint->streetNumber,
                'address_additive' => $meterPoint->addressAdditive,
            ],
            'meter_number' => $meterPoint?->firstMeter()?->meterNumber,
            'malo_id' => $meterPoint?->maloId,
            'yearly_consumption' => $meterPoint?->yearlyConsumption,
            'delivery_start' => $this->contract->deliveryStart?->toDateString(),
            'delivery_end' => $this->contract->deliveryEnd?->toDateString(),
            'installment_amount_cents' => $this->contract->currentPaymentPlan(CarbonImmutable::now())?->amount,
        ];
    }
}
