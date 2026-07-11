<?php

declare(strict_types=1);

namespace App\Integrations\MarketPartnerApi\Data;

use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;

/**
 * One spot market price slot. Response field names (`starts_at`, `ends_at`,
 * `cent_per_mwh`) verified against the old FetchMarketPrices command.
 */
final readonly class MarketPriceData
{
    public function __construct(
        public CarbonImmutable $startsAt,
        public CarbonImmutable $endsAt,
        public float $centPerMwh,
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
            startsAt: $payload->date('starts_at'),
            endsAt: $payload->date('ends_at'),
            centPerMwh: $payload->float('cent_per_mwh'),
        );
    }
}
