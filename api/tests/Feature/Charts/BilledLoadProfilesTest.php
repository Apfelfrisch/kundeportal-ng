<?php

declare(strict_types=1);

namespace Tests\Feature\Charts;

use App\Integrations\CustomerDataApi\Requests\GetBilledLoadProfilesRequest;
use App\Integrations\CustomerDataApi\Requests\GetContractRequest;
use App\Integrations\CustomerDataApi\Requests\GetLastBillingDateRequest;
use App\Models\User;
use Carbon\CarbonImmutable;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Tests\Fixtures\FixtureLoader;

final class BilledLoadProfilesTest extends ChartsTestCase
{
    public function test_the_endpoint_is_hidden_when_the_feature_flag_is_off(): void
    {
        $user = $this->customerWithContract();

        MockClient::global([]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles")
            ->assertNotFound();
    }

    public function test_guests_are_rejected(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        $this->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles")
            ->assertUnauthorized();
    }

    public function test_a_foreign_customer_is_rejected(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();
        $other = User::factory()->create();

        MockClient::global([]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$other->id}/contracts/123456/billed-load-profiles")
            ->assertForbidden();
    }

    public function test_an_unconfirmed_assignment_is_rejected(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract(confirmed: false);

        MockClient::global([]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles")
            ->assertForbidden()
            ->assertJsonPath('message', 'Sie haben keinen Zugriff auf diesen Vertrag.');
    }

    public function test_the_requested_day_returns_entries_with_the_cost_split(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        $mockClient = MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetBilledLoadProfilesRequest::class => new MockResponse(FixtureLoader::raw('customer-data-api/billed-load-profiles.json')),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles?date=2025-06-10")
            ->assertOk()
            ->assertJsonPath('data.date', '2025-06-10')
            ->assertJsonPath('data.from', '2025-06-09')
            ->assertJsonPath('data.until', '2025-06-11')
            ->assertJsonCount(2, 'data.entries')
            ->assertJsonPath('data.entries.0.from', '2025-06-10T00:00:00')
            ->assertJsonPath('data.entries.0.until', '2025-06-10T00:15:00')
            ->assertJsonPath('data.entries.0.usage_kwh', 0.35)
            // workingPrice 0.0721 + eegFee 0.0205 (EUR/kWh) → 9.26 ct/kWh.
            ->assertJsonPath('data.entries.0.legal_costs_ct_kwh', 9.26)
            // supplierWorkingPrice 0.02 EUR/kWh → 2 ct/kWh (purchase price
            // skipped); whole numbers lose their zero fraction in json_encode.
            ->assertJsonPath('data.entries.0.supplier_costs_ct_kwh', 2)
            // cent_mwh 8213 → 8.213 ct/kWh.
            ->assertJsonPath('data.entries.0.stock_exchange_ct_kwh', 8.213)
            ->assertJsonPath('data.entries.0.total_ct_kwh', 19.473)
            // Entry without price components: only the stock exchange share.
            ->assertJsonPath('data.entries.1.legal_costs_ct_kwh', 0)
            ->assertJsonPath('data.entries.1.supplier_costs_ct_kwh', 0)
            ->assertJsonPath('data.entries.1.stock_exchange_ct_kwh', 7.9505)
            ->assertJsonPath('data.entries.1.total_ct_kwh', 7.9505)
            ->assertJsonPath('data.navigation.prev_date', '2025-06-09')
            ->assertJsonPath('data.navigation.next_date', '2025-06-11');

        // KVS window: from = center - 1 day, until = center + 2 days.
        $pendingRequest = $mockClient->getLastPendingRequest();
        $this->assertNotNull($pendingRequest);
        $this->assertSame(
            ['from' => '2025-06-09', 'until' => '2025-06-12'],
            $pendingRequest->query()->all(),
        );
    }

    public function test_the_center_defaults_to_the_last_billing_date(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        $mockClient = MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetLastBillingDateRequest::class => new MockResponse(['last_billing_date' => '2025-06-10']),
            GetBilledLoadProfilesRequest::class => new MockResponse(FixtureLoader::raw('customer-data-api/billed-load-profiles.json')),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles")
            ->assertOk()
            ->assertJsonPath('data.date', '2025-06-10');

        $pendingRequest = $mockClient->getLastPendingRequest();
        $this->assertNotNull($pendingRequest);
        $this->assertSame(
            ['from' => '2025-06-09', 'until' => '2025-06-12'],
            $pendingRequest->query()->all(),
        );
    }

    public function test_the_center_falls_back_to_yesterday_when_no_billing_date_exists(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $this->travelTo(CarbonImmutable::parse('2025-06-11 12:00:00'));

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetLastBillingDateRequest::class => new MockResponse(['last_billing_date' => null]),
            GetBilledLoadProfilesRequest::class => new MockResponse(FixtureLoader::raw('customer-data-api/billed-load-profiles.json')),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles")
            ->assertOk()
            ->assertJsonPath('data.date', '2025-06-10');
    }

    public function test_the_center_falls_back_to_yesterday_when_the_billing_date_call_fails(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $this->travelTo(CarbonImmutable::parse('2025-06-11 12:00:00'));

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetLastBillingDateRequest::class => new MockResponse([], 500),
            GetBilledLoadProfilesRequest::class => new MockResponse(FixtureLoader::raw('customer-data-api/billed-load-profiles.json')),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles")
            ->assertOk()
            ->assertJsonPath('data.date', '2025-06-10');
    }

    public function test_a_window_without_data_yields_an_empty_entry_list(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetBilledLoadProfilesRequest::class => new MockResponse(['data' => []]),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles?date=2025-06-10")
            ->assertOk()
            ->assertJsonPath('data.entries', []);
    }

    public function test_a_kvs_404_becomes_a_404_with_the_german_message(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetBilledLoadProfilesRequest::class => new MockResponse([], 404),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles?date=2025-06-10")
            ->assertNotFound()
            ->assertJsonPath('message', 'Vertrag 123456 wurde im System nicht gefunden. Fehlercode 404.');
    }

    public function test_an_invalid_date_parameter_is_rejected(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles?date=not-a-date")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('date');
    }

    public function test_an_administrator_bypasses_the_assignment_check(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetBilledLoadProfilesRequest::class => new MockResponse(FixtureLoader::raw('customer-data-api/billed-load-profiles.json')),
        ]);

        $this->actingAs($admin)
            ->getJson("/api/customers/{$customer->id}/contracts/123456/billed-load-profiles?date=2025-06-10")
            ->assertOk()
            ->assertJsonCount(2, 'data.entries');
    }
}
