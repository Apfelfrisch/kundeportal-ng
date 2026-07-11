<?php

declare(strict_types=1);

namespace App\Http\Resources\Charts;

use App\Domain\LoadProfile\LoadProfileCosts;
use App\Integrations\CustomerDataApi\Data\BilledLoadProfileEntryData;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A center day ± 1 day of billed 15-minute load profile slots with the
 * legal/supplier/stock-exchange cost split (all ct/kWh) precomputed, so the
 * Recharts bar+line chart and the per-day breakdown tables need no further
 * math (the old Blade view summed `total_ct_kwh` itself).
 */
final class BilledLoadProfileDayResource extends JsonResource
{
    /**
     * @param  list<array{entry: BilledLoadProfileEntryData, costs: LoadProfileCosts}>  $entries
     */
    public function __construct(
        private readonly CarbonImmutable $date,
        private readonly array $entries,
    ) {
        parent::__construct($entries);
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
            'entries' => array_map(
                static function (array $row): array {
                    $entry = $row['entry'];
                    $costs = $row['costs'];

                    return [
                        'from' => $entry->from->format('Y-m-d\TH:i:s'),
                        'until' => $entry->until->format('Y-m-d\TH:i:s'),
                        'usage_kwh' => $entry->usageKwh,
                        'legal_costs_ct_kwh' => round($costs->legalCostsCentKwh, 4),
                        'supplier_costs_ct_kwh' => round($costs->supplierCostsCentKwh, 4),
                        'stock_exchange_ct_kwh' => round($costs->stockExchangeCentKwh, 4),
                        'total_ct_kwh' => round(
                            $costs->legalCostsCentKwh + $costs->supplierCostsCentKwh + $costs->stockExchangeCentKwh,
                            4,
                        ),
                    ];
                },
                $this->entries,
            ),
            'navigation' => [
                'prev_date' => $this->date->subDay()->toDateString(),
                'next_date' => $this->date->addDay()->toDateString(),
            ],
        ];
    }
}
