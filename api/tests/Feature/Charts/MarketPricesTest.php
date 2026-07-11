<?php

declare(strict_types=1);

namespace Tests\Feature\Charts;

use App\Integrations\CustomerDataApi\Requests\GetContractsByIdsRequest;
use App\Models\MarketPrice;
use App\Models\User;
use Carbon\CarbonImmutable;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;

final class MarketPricesTest extends ChartsTestCase
{
    public function test_the_endpoint_is_hidden_when_the_feature_flag_is_off(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/market-prices")
            ->assertNotFound();
    }

    public function test_guests_are_rejected(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = User::factory()->create();

        $this->getJson("/api/customers/{$user->id}/market-prices")
            ->assertUnauthorized();
    }

    public function test_a_foreign_customer_is_rejected(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($user)
            ->getJson("/api/customers/{$other->id}/market-prices")
            ->assertForbidden();
    }

    public function test_the_requested_day_is_returned_with_its_neighbor_days(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = User::factory()->create();

        // Window 2025-06-09 … 2025-06-11 around ?date=2025-06-10.
        $this->createPrice('2025-06-08 23:45:00', 1000);  // outside (before)
        $this->createPrice('2025-06-09 00:00:00', 2000);  // first of the window
        $this->createPrice('2025-06-10 00:00:00', 8213);
        $this->createPrice('2025-06-10 00:15:00', 7951);
        $this->createPrice('2025-06-11 23:45:00', 3000);  // last of the window
        $this->createPrice('2025-06-12 00:00:00', 4000);  // outside (after)

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/market-prices?date=2025-06-10")
            ->assertOk()
            ->assertJsonPath('data.date', '2025-06-10')
            ->assertJsonPath('data.from', '2025-06-09')
            ->assertJsonPath('data.until', '2025-06-11')
            ->assertJsonCount(4, 'data.prices')
            ->assertJsonPath('data.prices.0.starts_at', '2025-06-09T00:00:00')
            // Whole numbers lose their zero fraction in json_encode.
            ->assertJsonPath('data.prices.0.cent_per_kwh', 2)
            ->assertJsonPath('data.prices.1.starts_at', '2025-06-10T00:00:00')
            ->assertJsonPath('data.prices.1.ends_at', '2025-06-10T00:15:00')
            ->assertJsonPath('data.prices.1.cent_per_kwh', 8.213)
            ->assertJsonPath('data.prices.2.cent_per_kwh', 7.951)
            ->assertJsonPath('data.prices.3.starts_at', '2025-06-11T23:45:00')
            ->assertJsonPath('data.navigation.prev_date', '2025-06-09')
            ->assertJsonPath('data.navigation.next_date', '2025-06-11');
    }

    public function test_the_center_defaults_to_the_day_of_the_latest_stored_price(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = User::factory()->create();

        $this->createPrice('2025-06-09 12:00:00', 5000);
        $this->createPrice('2025-06-10 00:15:00', 8213);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/market-prices")
            ->assertOk()
            ->assertJsonPath('data.date', '2025-06-10')
            ->assertJsonCount(2, 'data.prices');
    }

    public function test_an_empty_table_defaults_to_today_without_prices(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $this->travelTo(CarbonImmutable::parse('2025-06-15 12:00:00'));

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/market-prices")
            ->assertOk()
            ->assertJsonPath('data.date', '2025-06-15')
            ->assertJsonPath('data.prices', []);
    }

    public function test_an_invalid_date_parameter_is_rejected(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/market-prices?date=not-a-date")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('date');
    }

    public function test_an_administrator_can_view_the_chart_for_a_customer(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();

        $this->createPrice('2025-06-10 00:00:00', 8213);

        $this->actingAs($admin)
            ->getJson("/api/customers/{$customer->id}/market-prices?date=2025-06-10")
            ->assertOk()
            ->assertJsonCount(1, 'data.prices');
    }

    public function test_tariff_costs_of_a_dynamic_contract_are_included(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        $payload = $this->contractPayload();
        $payload['price_type'] = 'dynamic';

        MockClient::global([
            GetContractsByIdsRequest::class => new MockResponse(['data' => [$payload]]),
        ]);

        $costs = $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/market-prices")
            ->assertOk()
            ->json('data.tariff_costs');

        $this->assertIsArray($costs);
        // Fixture working price components without supplierPurchasePrice.
        $this->assertSame(17.459, $costs['total_ct']);

        $components = $costs['components'];
        $this->assertIsArray($components);
        $this->assertEqualsWithDelta(1.66, $components['Konzessionsabgabe'], 0.0001);
        // Beschaffungskosten stecken bereits im Börsenpreis, EEG-Umlage ist 0.
        $this->assertArrayNotHasKey('Beschaffungskosten', $components);
        $this->assertArrayNotHasKey('EEG-Umlage', $components);
    }

    public function test_tariff_costs_are_null_without_a_dynamic_contract(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        // Fixture default: price_type "fixed".
        MockClient::global([
            GetContractsByIdsRequest::class => new MockResponse(['data' => [$this->contractPayload()]]),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/market-prices")
            ->assertOk()
            ->assertJsonPath('data.tariff_costs', null);
    }

    public function test_a_kvs_outage_does_not_break_the_market_prices(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractsByIdsRequest::class => new MockResponse([], 500),
        ]);

        $this->createPrice('2025-06-10 00:00:00', 8213);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/market-prices?date=2025-06-10")
            ->assertOk()
            ->assertJsonCount(1, 'data.prices')
            ->assertJsonPath('data.tariff_costs', null);
    }

    private function createPrice(string $startsAt, int $centPerMwh): void
    {
        MarketPrice::factory()->create([
            'starts_at' => $startsAt,
            'ends_at' => CarbonImmutable::parse($startsAt)->addMinutes(15),
            'cent_per_mwh' => $centPerMwh,
        ]);
    }
}
