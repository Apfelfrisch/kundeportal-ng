<?php

declare(strict_types=1);

namespace App\Http\Resources\Charts;

use App\Models\MarketPrice;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A center day ± 1 day of quarter-hourly spot market prices, ready for the
 * Recharts step/line chart: raw numerics, ISO timestamps, ct/kWh already
 * converted from the stored cent/MWh (÷ 1000, rounded to 4 decimals — the
 * conversion the old ExchangeElectricityPricesController applied).
 */
final class MarketPriceDayResource extends JsonResource
{
    /**
     * @param  list<MarketPrice>  $prices
     * @param  array{total_ct: float, components: array<string, float>}|null  $tariffCosts
     */
    public function __construct(
        private readonly CarbonImmutable $date,
        private readonly array $prices,
        private readonly ?array $tariffCosts = null,
    ) {
        parent::__construct($prices);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'date' => $this->date->toDateString(),
            'from' => $this->date->subDay()->toDateString(),
            'until' => $this->date->addDay()->toDateString(),
            'prices' => array_map(
                static fn (MarketPrice $price): array => [
                    'starts_at' => $price->starts_at->format('Y-m-d\TH:i:s'),
                    'ends_at' => $price->ends_at->format('Y-m-d\TH:i:s'),
                    'cent_per_kwh' => round($price->cent_per_mwh / 1000, 4),
                ],
                $this->prices,
            ),
            'navigation' => [
                'prev_date' => $this->date->subDay()->toDateString(),
                'next_date' => $this->date->addDay()->toDateString(),
            ],
            // Konstanter Tarifaufschlag (ct/kWh) des dynamischen Vertrags,
            // ohne Börsenbezug — null ohne dynamischen Vertrag / bei KVS-Ausfall.
            'tariff_costs' => $this->tariffCosts,
        ];
    }
}
