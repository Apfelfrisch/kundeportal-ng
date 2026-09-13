<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;

/**
 * Span of the slots of one usage source, as returned by
 * GET /contract/{id}/{billed|unbilled}-load-profiles/period: start of the
 * first slot and end of the last slot.
 */
final readonly class UsagePeriodData
{
    public function __construct(
        public CarbonImmutable $from,
        public CarbonImmutable $until,
    ) {}

    /**
     * @param  array<array-key, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        $payload = Payload::of($data);

        return new self(
            from: $payload->date('from'),
            until: $payload->date('until'),
        );
    }

    /**
     * Hull of two spans; null stays out of the way.
     */
    public static function union(?self $a, ?self $b): ?self
    {
        if ($a === null || $b === null) {
            return $a ?? $b;
        }

        return new self($a->from->min($b->from), $a->until->max($b->until));
    }
}
