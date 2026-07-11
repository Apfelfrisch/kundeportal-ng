<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Integrations\CustomerDataApi\Data\MeterData;
use App\Integrations\CustomerDataApi\Data\MeterPointData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class MeterPointResource extends JsonResource
{
    public function __construct(
        private readonly MeterPointData $meterPoint,
    ) {
        parent::__construct($meterPoint);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->meterPoint->id,
            'malo_id' => $this->meterPoint->maloId,
            'zip' => $this->meterPoint->zip,
            'city' => $this->meterPoint->city,
            'street' => $this->meterPoint->street,
            'street_number' => $this->meterPoint->streetNumber,
            'address_additive' => $this->meterPoint->addressAdditive,
            'yearly_consumption' => $this->meterPoint->yearlyConsumption,
            'delivery_from' => $this->meterPoint->deliveryFrom?->toDateString(),
            'delivery_until' => $this->meterPoint->deliveryUntil?->toDateString(),
            'meters' => MeterResource::collection($this->metersByCreatedAtAsc()),
            'meter_counts' => MeterCountResource::collection($this->meterPoint->meterCountsByReadingDateDesc()),
        ];
    }

    /**
     * Ordered like the old MeterPoint::meter(): the first entry is the
     * earliest installed meter the Blade cards displayed.
     *
     * @return list<MeterData>
     */
    private function metersByCreatedAtAsc(): array
    {
        $meters = $this->meterPoint->meters;

        usort(
            $meters,
            static fn (MeterData $a, MeterData $b): int => ($a->createdAt?->getTimestamp() ?? PHP_INT_MIN) <=> ($b->createdAt?->getTimestamp() ?? PHP_INT_MIN),
        );

        return $meters;
    }
}
