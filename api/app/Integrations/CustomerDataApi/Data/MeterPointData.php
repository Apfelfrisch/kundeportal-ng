<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;

/**
 * Field mapping ported from the old ContractRepository::meterPoints().
 */
final readonly class MeterPointData
{
    /**
     * @param  list<MeterData>  $meters
     * @param  list<MeterCountData>  $meterCounts
     */
    public function __construct(
        public int $id,
        public int $contractNumber,
        public string $customerNumber,
        public ?string $maloId,
        public ?string $zip,
        public ?string $city,
        public ?string $street,
        public ?string $streetNumber,
        public ?string $addressAdditive,
        public ?float $yearlyConsumption,
        public ?CarbonImmutable $deliveryFrom,
        public ?CarbonImmutable $deliveryUntil,
        public array $meters,
        public array $meterCounts,
    ) {}

    /**
     * @param  array<array-key, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return self::fromPayload(Payload::of($data));
    }

    public static function fromPayload(Payload $payload): self
    {
        return new self(
            id: $payload->int('id'),
            contractNumber: $payload->int('contract_id'),
            customerNumber: $payload->string('customer_id'),
            maloId: $payload->nullableString('malo_id'),
            zip: $payload->nullableString('zip'),
            city: $payload->nullableString('city'),
            street: $payload->nullableString('street'),
            streetNumber: $payload->nullableString('street_number'),
            addressAdditive: $payload->nullableString('street_addition'),
            yearlyConsumption: $payload->nullableFloat('yearly_consumption'),
            deliveryFrom: $payload->nullableDate('delivery_from'),
            deliveryUntil: $payload->nullableDate('delivery_until'),
            meters: array_map(
                static fn (Payload $meter): MeterData => MeterData::fromPayload($meter),
                $payload->payloadList('meters'),
            ),
            meterCounts: array_map(
                static fn (Payload $meterCount): MeterCountData => MeterCountData::fromPayload($meterCount),
                $payload->payloadList('meter_counts'),
            ),
        );
    }

    /**
     * Old MeterPoint::meter(): the earliest installed meter (sorted by created_at ascending).
     */
    public function firstMeter(): ?MeterData
    {
        $meters = $this->meters;

        usort(
            $meters,
            static fn (MeterData $a, MeterData $b): int => ($a->createdAt?->getTimestamp() ?? PHP_INT_MIN) <=> ($b->createdAt?->getTimestamp() ?? PHP_INT_MIN),
        );

        return $meters[0] ?? null;
    }

    /**
     * Old MeterPoint::meterCounts(): readings sorted by reading_date descending.
     *
     * @return list<MeterCountData>
     */
    public function meterCountsByReadingDateDesc(): array
    {
        $meterCounts = $this->meterCounts;

        usort(
            $meterCounts,
            static fn (MeterCountData $a, MeterCountData $b): int => ($b->readingDate?->getTimestamp() ?? PHP_INT_MIN) <=> ($a->readingDate?->getTimestamp() ?? PHP_INT_MIN),
        );

        return $meterCounts;
    }
}
