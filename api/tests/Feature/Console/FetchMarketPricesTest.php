<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Integrations\MarketPartnerApi\Requests\GetMarketPricesRequest;
use App\Models\MarketPrice;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\PendingCommand;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Tests\Fixtures\FixtureLoader;
use Tests\TestCase;

final class FetchMarketPricesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.marketpartner_api.url', 'https://market.test');
        config()->set('services.marketpartner_api.token', 'market-token');
    }

    protected function tearDown(): void
    {
        MockClient::destroyGlobal();

        parent::tearDown();
    }

    public function test_a_first_run_fetches_one_month_back_until_the_day_after_tomorrow(): void
    {
        $this->travelTo(CarbonImmutable::parse('2025-06-10 09:00:00'));

        $mockClient = MockClient::global([
            GetMarketPricesRequest::class => new MockResponse(FixtureLoader::raw('market-partner-api/market-prices.json')),
        ]);

        $this->runArtisan('app:fetch-market-prices')
            ->expectsOutputToContain('2 Preise gespeichert.')
            ->assertSuccessful();

        $pendingRequest = $mockClient->getLastPendingRequest();
        $this->assertNotNull($pendingRequest);
        $this->assertSame(
            ['starts_at' => '2025-05-10T00:00:00', 'ends_at' => '2025-06-12T00:00:00'],
            $pendingRequest->query()->all(),
        );

        $this->assertDatabaseCount('market_prices', 2);
        $this->assertDatabaseHas('market_prices', [
            'starts_at' => '2025-06-10 00:00:00',
            'ends_at' => '2025-06-10 00:15:00',
            'cent_per_mwh' => 8213,
        ]);
        // 7950.5 cent/MWh is rounded into the integer column.
        $this->assertDatabaseHas('market_prices', [
            'starts_at' => '2025-06-10 00:15:00',
            'cent_per_mwh' => 7951,
        ]);
    }

    public function test_it_continues_after_the_latest_slot_and_updates_existing_rows(): void
    {
        $this->travelTo(CarbonImmutable::parse('2025-06-10 09:00:00'));

        MarketPrice::factory()->create([
            'starts_at' => '2025-06-10 00:00:00',
            'ends_at' => '2025-06-10 00:10:00',
            'cent_per_mwh' => 1,
        ]);

        $mockClient = MockClient::global([
            GetMarketPricesRequest::class => new MockResponse(FixtureLoader::raw('market-partner-api/market-prices.json')),
        ]);

        $this->runArtisan('app:fetch-market-prices')->assertSuccessful();

        // Fetch window starts 15 minutes after the latest stored slot.
        $pendingRequest = $mockClient->getLastPendingRequest();
        $this->assertNotNull($pendingRequest);
        $this->assertSame(
            ['starts_at' => '2025-06-10T00:15:00', 'ends_at' => '2025-06-12T00:00:00'],
            $pendingRequest->query()->all(),
        );

        // The existing row was updated (upsert on starts_at), the new one inserted.
        $this->assertDatabaseCount('market_prices', 2);
        $this->assertDatabaseHas('market_prices', [
            'starts_at' => '2025-06-10 00:00:00',
            'ends_at' => '2025-06-10 00:15:00',
            'cent_per_mwh' => 8213,
        ]);
        $this->assertDatabaseHas('market_prices', [
            'starts_at' => '2025-06-10 00:15:00',
            'cent_per_mwh' => 7951,
        ]);
    }

    public function test_it_skips_the_api_call_when_no_new_prices_are_expected(): void
    {
        $this->travelTo(CarbonImmutable::parse('2025-06-10 09:00:00'));

        MarketPrice::factory()->create([
            'starts_at' => '2025-06-12 00:00:00',
            'ends_at' => '2025-06-12 00:15:00',
            'cent_per_mwh' => 5000,
        ]);

        $mockClient = MockClient::global([]);

        $this->runArtisan('app:fetch-market-prices')
            ->expectsOutputToContain('Keine neuen Preise zu laden.')
            ->assertSuccessful();

        $mockClient->assertNothingSent();
        $this->assertDatabaseCount('market_prices', 1);
    }

    public function test_a_failed_api_request_returns_failure(): void
    {
        MockClient::global([
            GetMarketPricesRequest::class => new MockResponse([], 500),
        ]);

        $this->runArtisan('app:fetch-market-prices')
            ->expectsOutputToContain('API-Anfrage fehlgeschlagen: 500')
            ->assertFailed();

        $this->assertDatabaseCount('market_prices', 0);
    }

    public function test_an_empty_price_list_is_reported_without_writes(): void
    {
        MockClient::global([
            GetMarketPricesRequest::class => new MockResponse(['data' => ['prices' => []]]),
        ]);

        $this->runArtisan('app:fetch-market-prices')
            ->expectsOutputToContain('API hat keine Preise zurückgegeben.')
            ->assertSuccessful();

        $this->assertDatabaseCount('market_prices', 0);
    }

    /**
     * Like artisan(), but with a guaranteed PendingCommand return type.
     */
    private function runArtisan(string $command): PendingCommand
    {
        $pending = $this->artisan($command);

        if (! $pending instanceof PendingCommand) {
            self::fail('Expected a PendingCommand instance.');
        }

        return $pending;
    }
}
