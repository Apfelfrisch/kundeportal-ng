<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;

/**
 * One 15-minute slot of an EDI (smart meter) load profile, as returned by
 * GET /contract/{id}/edi-load-profiles. `amount` is the usage in kWh.
 */
final readonly class EdiLoadProfileEntryData
{
    public function __construct(
        public ?int $id,
        public CarbonImmutable $readingStart,
        public CarbonImmutable $readingEnd,
        public float $amount,
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
            id: $payload->optionalInt('id'),
            readingStart: $payload->date('reading_start'),
            readingEnd: $payload->date('reading_end'),
            amount: $payload->float('amount'),
        );
    }
}
