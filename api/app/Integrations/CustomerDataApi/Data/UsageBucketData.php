<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;

/**
 * One bucket of GET /contract/{id}/{billed|unbilled}-load-profiles/usage:
 * usage in kWh and the cost split of that bucket in cents (already
 * multiplied by the usage — not ct/kWh like the raw slots), the base
 * prices of the tariff spread over the slots, and the plain average price
 * of the slots in ct/kWh (the last three optional: older KVS versions do
 * not send them).
 */
final readonly class UsageBucketData
{
    public function __construct(
        public CarbonImmutable $from,
        public float $usageKwh,
        public float $legalCt,
        public float $supplierCt,
        public float $stockExchangeCt,
        public ?float $priceCtKwh = null,
        public float $supplierBaseCt = 0.0,
        public float $legalBaseCt = 0.0,
    ) {}

    /**
     * The absence of a row: nothing used, nothing to add.
     */
    public static function zero(CarbonImmutable $from): self
    {
        return new self($from, 0.0, 0.0, 0.0, 0.0);
    }

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
            from: $payload->date('from'),
            usageKwh: $payload->float('usage_kwh'),
            legalCt: $payload->float('legal_ct'),
            supplierCt: $payload->float('supplier_ct'),
            stockExchangeCt: $payload->float('stock_exchange_ct'),
            priceCtKwh: $payload->optionalFloat('price_ct_kwh'),
            supplierBaseCt: $payload->optionalFloat('supplier_base_ct') ?? 0.0,
            legalBaseCt: $payload->optionalFloat('legal_base_ct') ?? 0.0,
        );
    }

    public function totalCt(): float
    {
        return $this->legalCt + $this->supplierCt + $this->stockExchangeCt + $this->supplierBaseCt + $this->legalBaseCt;
    }
}
