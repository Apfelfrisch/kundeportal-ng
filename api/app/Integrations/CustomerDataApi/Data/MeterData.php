<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;

/**
 * Field mapping ported from the old ContractRepository::meters().
 * `smart_meter` keeps the old loose `(boolean)` cast semantics.
 */
final readonly class MeterData
{
    public function __construct(
        public int $id,
        public int $meterPointId,
        public string $meterNumber,
        public ?string $type,
        public bool $smartMeter,
        public ?CarbonImmutable $createdAt,
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
            meterNumber: $payload->string('meter_number'),
            type: $payload->nullableString('type'),
            smartMeter: $payload->looseBool('smart_meter'),
            createdAt: $payload->nullableDate('created_at'),
        );
    }
}
