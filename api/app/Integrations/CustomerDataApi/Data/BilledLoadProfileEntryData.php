<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;

/**
 * One 15-minute slot of a billed (tariff) load profile, as returned by
 * GET /contract/{id}/billed-load-profiles.
 *
 * `cent_mwh` is the stock exchange price in cents per MWh — the old
 * ContractLoadProfileRepository converted it to ct/kWh via `cent_mwh / 1000`
 * and split the working-price components into legal/supplier shares; that
 * arithmetic lives in {@see \App\Domain\LoadProfile\BilledLoadProfileCalculator}.
 *
 * `price_components` used `?? []` in the old repository, hence the default here.
 */
final readonly class BilledLoadProfileEntryData
{
    /**
     * @param  list<PriceComponentData>  $priceComponents
     */
    public function __construct(
        public ?int $id,
        public CarbonImmutable $from,
        public CarbonImmutable $until,
        public float $usageKwh,
        public ?int $usageType,
        public ?string $priceTag,
        public ?string $tariffName,
        public float $centMwh,
        public array $priceComponents,
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
            from: $payload->date('from'),
            until: $payload->date('until'),
            usageKwh: $payload->float('usage_kwh'),
            usageType: $payload->optionalInt('usage_type'),
            priceTag: $payload->optionalString('price_tag'),
            tariffName: $payload->optionalString('tariff_name'),
            centMwh: $payload->float('cent_mwh'),
            priceComponents: array_map(
                static fn (Payload $component): PriceComponentData => PriceComponentData::fromPayload($component),
                $payload->optionalPayloadList('price_components') ?? [],
            ),
        );
    }
}
