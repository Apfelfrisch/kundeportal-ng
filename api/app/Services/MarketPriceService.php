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
        $latestPriceStart = $this->latestPriceStart();

        // Standard-Zentrum: der Tag VOR dem letzten Preistag, damit das
        // Fenster Zentrum ± 1 vollständig abgedeckt ist. Mit Day-Ahead-Daten
        // (letzter Preistag = morgen) ist das Zentrum genau heute.
        $center = $date ?? $latestPriceStart?->subDay() ?? CarbonImmutable::today();

        $prices = MarketPrice::query()
            ->whereBetween('starts_at', [
                $center->subDay()->startOfDay(),
                $center->addDay()->endOfDay(),
            ])
            ->orderBy('starts_at')
            ->get()
            ->all();

        // Einen Tag vor geht es nur, solange auch das nächste Fenster noch
        // komplett mit Preisen abgedeckt ist — sein letzter Tag (Zentrum + 2)
        // muss also noch Preise haben. So endet die Ansicht nie in Leere.
        $nextCenter = $center->addDay();

        return [
            'date' => $center,
            'prices' => array_values($prices),
            'nextDate' => $nextCenter->addDay()->startOfDay() <= ($latestPriceStart ?? CarbonImmutable::today())
                ? $nextCenter
                : null,
        ];
    }

    /**
     * Start of the latest known price; null while no prices are stored yet.
     */
    private function latestPriceStart(): ?CarbonImmutable
    {
        $latest = MarketPrice::query()->max('starts_at');

        return is_string($latest) && $latest !== ''
            ? CarbonImmutable::parse($latest)
            : null;
    }
}
