<?php

declare(strict_types=1);

namespace App\Http\Resources\Charts;

use App\Domain\Usage\UsageBucket;
use App\Domain\Usage\UsageResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One window of usage for the bar+line chart: gapless buckets with usage,
 * the provisional (not yet invoiced) share, the net cost split in cents
 * (working price shares plus the pro-rated base prices, kept apart so the
 * client decides how to stack them), the usage-weighted price and the
 * plain slot price, the totals of the window, the span with data (the
 * client derives the periods to page to from it), and — when invoices tile
 * the window — the invoiced amount.
 */
final class UsageResource extends JsonResource
{
    public function __construct(private readonly UsageResult $result)
    {
        parent::__construct($result);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $window = $this->result->window;
        $available = $this->result->available;
        $invoiced = $this->result->invoiced;

        return [
            // Bucket size of the chart: a day in hours, a month in days, a year in months.
            'period' => $window->period->value,
            'from' => $window->from->toDateString(),
            'until' => $window->until->subDay()->toDateString(),
            'available' => $available === null
                ? null
                : [
                    'from' => $available->from->toDateString(),
                    'until' => $available->until->subSecond()->toDateString(),
                ],
            'totals' => self::bucket($window->totals()),
            'buckets' => array_map(self::bucket(...), $window->buckets),
            'invoiced' => $invoiced === null
                ? null
                : [
                    'amount_cents' => $invoiced->amountCents,
                    'consumption_kwh' => $invoiced->consumptionKwh,
                    'invoice_numbers' => $invoiced->invoiceNumbers,
                ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function bucket(UsageBucket $bucket): array
    {
        $average = $bucket->averageCtKwh();

        return [
            'from' => $bucket->from->format('Y-m-d\TH:i:s'),
            'until' => $bucket->until->format('Y-m-d\TH:i:s'),
            'has_data' => $bucket->hasData,
            'usage_kwh' => round($bucket->usageKwh, 3),
            'unbilled_kwh' => round($bucket->unbilledKwh, 3),
            'cost_ct' => round($bucket->totalCt(), 4),
            'unbilled_ct' => round($bucket->unbilledCt, 4),
            'legal_ct' => round($bucket->legalCt, 4),
            'supplier_ct' => round($bucket->supplierCt, 4),
            'stock_exchange_ct' => round($bucket->stockExchangeCt, 4),
            'legal_base_ct' => round($bucket->legalBaseCt, 4),
            'supplier_base_ct' => round($bucket->supplierBaseCt, 4),
            'average_ct_kwh' => $average === null ? null : round($average, 4),
            'price_ct_kwh' => $bucket->priceCtKwh === null ? null : round($bucket->priceCtKwh, 4),
        ];
    }
}
