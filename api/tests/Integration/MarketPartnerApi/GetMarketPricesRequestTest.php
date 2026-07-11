<?php

declare(strict_types=1);

namespace Tests\Integration\MarketPartnerApi;

use App\Integrations\MarketPartnerApi\Data\MarketPriceData;
use App\Integrations\MarketPartnerApi\MarketPartnerApiConnector;
use App\Integrations\MarketPartnerApi\Requests\GetMarketPricesRequest;
use Carbon\CarbonImmutable;
use Saloon\Enums\Method;
use Saloon\Exceptions\Request\RequestException;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Tests\Fixtures\FixtureLoader;
use Tests\TestCase;

final class GetMarketPricesRequestTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.marketpartner_api.url', 'https://market.test');
        config()->set('services.marketpartner_api.token', 'market-token');
    }

    public function test_it_fetches_market_prices_for_a_time_range(): void
    {
        $mockClient = new MockClient([
            GetMarketPricesRequest::class => new MockResponse(FixtureLoader::raw('market-partner-api/market-prices.json')),
        ]);

        $request = new GetMarketPricesRequest(
            startsAt: CarbonImmutable::parse('2025-06-10 00:00:00'),
            endsAt: CarbonImmutable::parse('2025-06-12 00:00:00'),
        );
        $response = $this->connector($mockClient)->send($request);
        $prices = $request->createDtoFromResponse($response);

        $pendingRequest = $mockClient->getLastPendingRequest();
        $this->assertNotNull($pendingRequest);
        $this->assertSame('/api/v1/market-prices', parse_url($pendingRequest->getUrl(), PHP_URL_PATH));
        $this->assertSame(Method::GET, $pendingRequest->getMethod());
        $this->assertSame(
            ['starts_at' => '2025-06-10T00:00:00', 'ends_at' => '2025-06-12T00:00:00'],
            $pendingRequest->query()->all(),
        );
        $this->assertSame('Bearer market-token', $pendingRequest->headers()->get('Authorization'));

        $this->assertCount(2, $prices);
        $this->assertInstanceOf(MarketPriceData::class, $prices[0]);
        $this->assertSame('2025-06-10 00:00:00', $prices[0]->startsAt->format('Y-m-d H:i:s'));
        $this->assertSame('2025-06-10 00:15:00', $prices[0]->endsAt->format('Y-m-d H:i:s'));
        $this->assertSame(8213.0, $prices[0]->centPerMwh);
        $this->assertSame(7950.5, $prices[1]->centPerMwh);
    }

    public function test_a_missing_prices_key_yields_an_empty_list(): void
    {
        $mockClient = new MockClient([
            GetMarketPricesRequest::class => new MockResponse(['data' => []]),
        ]);

        $request = new GetMarketPricesRequest(
            startsAt: CarbonImmutable::parse('2025-06-10 00:00:00'),
            endsAt: CarbonImmutable::parse('2025-06-12 00:00:00'),
        );
        $response = $this->connector($mockClient)->send($request);

        $this->assertSame([], $request->createDtoFromResponse($response));
    }

    public function test_failed_responses_throw(): void
    {
        $mockClient = new MockClient([
            GetMarketPricesRequest::class => new MockResponse([], 500),
        ]);

        $this->expectException(RequestException::class);

        $this->connector($mockClient)->send(new GetMarketPricesRequest(
            startsAt: CarbonImmutable::parse('2025-06-10 00:00:00'),
            endsAt: CarbonImmutable::parse('2025-06-12 00:00:00'),
        ));
    }

    private function connector(MockClient $mockClient): MarketPartnerApiConnector
    {
        $connector = new MarketPartnerApiConnector;
        $connector->withMockClient($mockClient);

        return $connector;
    }
}
