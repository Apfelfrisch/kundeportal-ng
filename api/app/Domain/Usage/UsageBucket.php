<?php

declare(strict_types=1);

namespace App\Domain\Usage;

use Carbon\CarbonImmutable;

/**
 * One bar of the usage chart: the invoiced and the not-yet-invoiced share
 * added up. Costs are net cents of the whole bucket — the KVS split
 * legal/supplier/stock exchange of the working price plus the base prices
 * pro-rated over the bucket; `unbilledKwh`/`unbilledCt` say how much of
 * it is still provisional. `priceCtKwh` is the plain average working price
 * of the slots, independent of usage. A bucket without any slot keeps
 * zeros and `hasData = false`, so the chart can draw the gap.
 */
final readonly class UsageBucket
{
    public function __construct(
        public CarbonImmutable $from,
        public CarbonImmutable $until,
        public float $usageKwh,
        public float $unbilledKwh,
        public float $legalCt,
        public float $supplierCt,
        public float $stockExchangeCt,
        public float $unbilledCt,
        public bool $hasData,
        public ?float $priceCtKwh = null,
        public float $supplierBaseCt = 0.0,
        public float $legalBaseCt = 0.0,
    ) {}

    public static function empty(CarbonImmutable $from, CarbonImmutable $until): self
    {
        return new self($from, $until, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, false);
    }

    public function withPriceCtKwh(?float $priceCtKwh): self
    {
        return new self(
            $this->from,
            $this->until,
            $this->usageKwh,
            $this->unbilledKwh,
            $this->legalCt,
            $this->supplierCt,
            $this->stockExchangeCt,
            $this->unbilledCt,
            $this->hasData,
            $priceCtKwh,
            $this->supplierBaseCt,
            $this->legalBaseCt,
        );
    }

    public function workingCt(): float
    {
        return $this->legalCt + $this->supplierCt + $this->stockExchangeCt;
    }

    public function baseCt(): float
    {
        return $this->supplierBaseCt + $this->legalBaseCt;
    }

    public function totalCt(): float
    {
        return $this->workingCt() + $this->baseCt();
    }

    /**
     * Usage-weighted average working price of the bucket; null without
     * usage (the base price has no per-kWh meaning).
     */
    public function averageCtKwh(): ?float
    {
        return $this->usageKwh > 0 ? $this->workingCt() / $this->usageKwh : null;
    }
}
