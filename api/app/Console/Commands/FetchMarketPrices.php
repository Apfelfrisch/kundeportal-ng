<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Integrations\MarketPartnerApi\Data\MarketPriceData;
use App\Integrations\MarketPartnerApi\MarketPartnerApiConnector;
use App\Integrations\MarketPartnerApi\Requests\GetMarketPricesRequest;
use App\Models\MarketPrice;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Saloon\Exceptions\Request\RequestException;

/**
 * Port of the old FetchMarketPrices command: fetch window from 15 minutes
 * after the latest stored slot (first run: one month back) until the day
 * after tomorrow, upsert on the unique `starts_at`.
 */
final class FetchMarketPrices extends Command
{
    protected $signature = 'app:fetch-market-prices';

    protected $description = 'Spotpreise von der Market-Partner-API abrufen und in market_prices speichern.';

    public function handle(MarketPartnerApiConnector $connector): int
    {
        $lastEntry = MarketPrice::query()->orderByDesc('starts_at')->first();

        $startsAt = $lastEntry instanceof MarketPrice
            ? $lastEntry->starts_at->addMinutes(15)
            : CarbonImmutable::today()->subMonth();

        $endsAt = CarbonImmutable::today()->addDays(2);

        if ($startsAt >= $endsAt) {
            $this->info('Keine neuen Preise zu laden.');

            return self::SUCCESS;
        }

        $this->info("Lade Preise von {$startsAt->format('Y-m-d H:i')} bis {$endsAt->format('Y-m-d H:i')} …");

        $request = new GetMarketPricesRequest($startsAt, $endsAt);

        try {
            $prices = $request->createDtoFromResponse($connector->send($request));
        } catch (RequestException $exception) {
            $this->error('API-Anfrage fehlgeschlagen: '.$exception->getResponse()->status());

            return self::FAILURE;
        }

        if ($prices === []) {
            $this->info('API hat keine Preise zurückgegeben.');

            return self::SUCCESS;
        }

        MarketPrice::query()->upsert(
            array_map(
                static fn (MarketPriceData $price): array => [
                    'starts_at' => $price->startsAt->format('Y-m-d H:i:s'),
                    'ends_at' => $price->endsAt->format('Y-m-d H:i:s'),
                    'cent_per_mwh' => (int) round($price->centPerMwh),
                ],
                $prices,
            ),
            ['starts_at'],
            ['ends_at', 'cent_per_mwh'],
        );

        $this->info(count($prices).' Preise gespeichert.');

        return self::SUCCESS;
    }
}
