<?php

declare(strict_types=1);

namespace App\Integrations\MarketPartnerApi\Requests;

use App\Integrations\CustomerDataApi\Exceptions\InvalidApiPayloadException;
use App\Integrations\MarketPartnerApi\Data\MarketPriceData;
use Carbon\CarbonImmutable;
use Saloon\Enums\Method;
use Saloon\Http\Request;
use Saloon\Http\Response;

/**
 * GET /api/v1/market-prices?starts_at=...&ends_at=... — endpoint path, query
 * format (Y-m-d\TH:i:s) and response shape (`data.prices`, defaulting to an
 * empty list) verified against the old FetchMarketPrices command.
 */
final class GetMarketPricesRequest extends Request
{
    protected Method $method = Method::GET;

    public function __construct(
        private readonly CarbonImmutable $startsAt,
        private readonly CarbonImmutable $endsAt,
    ) {}

    public function resolveEndpoint(): string
    {
        return '/api/v1/market-prices';
    }

    /**
     * @return array<string, string>
     */
    protected function defaultQuery(): array
    {
        return [
            'starts_at' => $this->startsAt->format('Y-m-d\TH:i:s'),
            'ends_at' => $this->endsAt->format('Y-m-d\TH:i:s'),
        ];
    }

    /**
     * @return list<MarketPriceData>
     */
    public function createDtoFromResponse(Response $response): array
    {
        $prices = $response->json('data.prices', []);

        if (! is_array($prices)) {
            throw InvalidApiPayloadException::wrongType('data.prices', 'list', $prices);
        }

        $marketPrices = [];

        foreach (array_values($prices) as $index => $price) {
            if (! is_array($price)) {
                throw InvalidApiPayloadException::wrongType('data.prices.'.$index, 'array', $price);
            }

            $marketPrices[] = MarketPriceData::fromArray($price);
        }

        return $marketPrices;
    }
}
