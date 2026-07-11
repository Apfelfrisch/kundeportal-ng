<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\MarketPrice;
use Carbon\CarbonImmutable;

/**
 * Day windowing over the locally persisted spot market prices, ported from
 * the old ExchangeElectricityPricesController: the shown window is the
 * center day ± 1 day; without an explicit date the center defaults to the
 * day of the latest known price (fallback: today).
 */
final class MarketPriceService
{
    /**
     * @return array{date: CarbonImmutable, prices: list<MarketPrice>, nextDate: CarbonImmutable|null}
     */
    public function day(?CarbonImmutable $date = null): array
    {
        $center = $date ?? $this->latestPriceDate();

        $prices = MarketPrice::query()
            ->whereBetween('starts_at', [
                $center->subDay()->startOfDay(),
                $center->addDay()->endOfDay(),
            ])
            ->orderBy('starts_at')
            ->get()
            ->all();

        // Einen Tag vor geht es nur, solange das nächste Fenster noch
        // mindestens zwei Tage mit Preisen abdeckt — also solange der
        // nächste Zentrumstag selbst noch Preise hat.
        $nextCenter = $center->addDay();

        return [
            'date' => $center,
            'prices' => array_values($prices),
            'nextDate' => $nextCenter->startOfDay() <= $this->latestPriceDate()
                ? $nextCenter
                : null,
        ];
    }

    private function latestPriceDate(): CarbonImmutable
    {
        $latest = MarketPrice::query()->max('starts_at');

        return is_string($latest) && $latest !== ''
            ? CarbonImmutable::parse($latest)
            : CarbonImmutable::today();
    }
}
