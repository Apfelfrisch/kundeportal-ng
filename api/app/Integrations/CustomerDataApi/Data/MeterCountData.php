<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;

/**
 * Field mapping ported from the old ContractRepository::meterCounts().
 *
 * `reading_kind` carries KVS ids like "220"/"87"/"67" (see MeterCountReadingKind),
 * `reading_type` carries KVS ids like "MVR"/"PMR"/"COT"/"EMV"/"SMV"
 * (see MeterCountReadingType).
 */
final readonly class MeterCountData
{
    public function __construct(
        public int $id,
        public int $meterPointId,
        public ?int $meterId,
        public ?string $meterNumber,
        public ?string $type,
        public ?string $readingKind,
        public ?string $readingType,
        public ?CarbonImmutable $readingDate,
        public ?float $meterCount1,
        public ?float $meterCount2,
        public ?float $meterCount3,
        public ?float $yearlyUsage,
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
            meterPointId: $payload->int('meter_point_id'),
            meterId: $payload->nullableInt('meter_id'),
            meterNumber: $payload->nullableString('meter_number'),
            type: $payload->nullableString('type'),
            readingKind: $payload->nullableString('reading_kind'),
            readingType: $payload->nullableString('reading_type'),
            readingDate: $payload->nullableDate('reading_date'),
            meterCount1: $payload->nullableFloat('meter_count_1'),
            meterCount2: $payload->nullableFloat('meter_count_2'),
            meterCount3: $payload->nullableFloat('meter_count_3'),
            yearlyUsage: $payload->nullableFloat('yearly_usage'),
        );
    }
}
