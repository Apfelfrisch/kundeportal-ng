<?php

declare(strict_types=1);

namespace Tests\Feature\Charts;

use App\Domain\Usage\UsageSource;
use App\Integrations\CustomerDataApi\Requests\GetContractRequest;
use App\Integrations\CustomerDataApi\Requests\GetUsagePeriodRequest;
use App\Integrations\CustomerDataApi\Requests\GetUsageRequest;
use App\Models\User;
use Carbon\CarbonImmutable;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Saloon\Http\PendingRequest;
use Tests\Fixtures\FixtureLoader;

final class UsageTest extends ChartsTestCase
{
    public function test_the_endpoint_is_hidden_when_the_feature_flag_is_off(): void
    {
        $user = $this->customerWithContract();

        MockClient::global([]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage")
            ->assertNotFound();
    }

    public function test_guests_are_rejected(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        $this->getJson("/api/customers/{$user->id}/contracts/123456/usage")
            ->assertUnauthorized();
    }

    public function test_a_foreign_customer_is_rejected(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();
        $other = User::factory()->create();

        MockClient::global([]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$other->id}/contracts/123456/usage")
            ->assertForbidden();
    }

    public function test_an_unconfirmed_assignment_is_rejected(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract(confirmed: false);

        MockClient::global([]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage")
            ->assertForbidden();
    }

    public function test_a_month_merges_both_sources_into_gapless_daily_buckets(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        $mockClient = MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetUsagePeriodRequest::class => static fn (PendingRequest $pending): MockResponse => self::bySource(
                $pending,
                billed: new MockResponse(['from' => '2025-03-12 00:00:00', 'until' => '2025-06-30 00:00:00']),
                unbilled: new MockResponse(['from' => '2025-06-30 00:00:00', 'until' => '2025-07-02 00:00:00']),
            ),
            GetUsageRequest::class => static fn (PendingRequest $pending): MockResponse => self::bySource(
                $pending,
                billed: new MockResponse(FixtureLoader::raw('customer-data-api/billed-usage.json')),
                unbilled: new MockResponse(FixtureLoader::raw('customer-data-api/unbilled-usage.json')),
            ),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?period=month&date=2025-06-10")
            ->assertOk()
            ->assertJsonPath('data.period', 'month')
            ->assertJsonPath('data.from', '2025-06-01')
            ->assertJsonPath('data.until', '2025-06-30')
            // Hull of both sources.
            ->assertJsonPath('data.available.from', '2025-03-12')
            ->assertJsonPath('data.available.until', '2025-07-01')
            ->assertJsonCount(30, 'data.buckets')
            ->assertJsonPath('data.buckets.0.from', '2025-06-01T00:00:00')
            ->assertJsonPath('data.buckets.0.until', '2025-06-02T00:00:00')
            ->assertJsonPath('data.buckets.0.has_data', true)
            ->assertJsonPath('data.buckets.0.usage_kwh', 12.5)
            ->assertJsonPath('data.buckets.0.unbilled_kwh', 0)
            ->assertJsonPath('data.buckets.0.legal_ct', 115.75)
            ->assertJsonPath('data.buckets.0.supplier_ct', 25)
            ->assertJsonPath('data.buckets.0.stock_exchange_ct', 102.66)
            // Base prices count towards the costs, kept apart from the working price shares …
            ->assertJsonPath('data.buckets.0.legal_base_ct', 4)
            ->assertJsonPath('data.buckets.0.supplier_base_ct', 1)
            ->assertJsonPath('data.buckets.0.cost_ct', 248.41)
            // … and stay out of the price per kWh.
            ->assertJsonPath('data.buckets.0.average_ct_kwh', 19.4728)
            ->assertJsonPath('data.buckets.0.price_ct_kwh', 18.9)
            ->assertJsonPath('data.buckets.1.average_ct_kwh', 10.86)
            ->assertJsonPath('data.buckets.1.price_ct_kwh', 10.86)
            // Without a plain price from KVS the weighted one fills in.
            ->assertJsonPath('data.buckets.29.price_ct_kwh', 18.76)
            // A day of self-supply without usage has no weighted price, but the plain slot price.
            ->assertJsonPath('data.buckets.2.has_data', true)
            ->assertJsonPath('data.buckets.2.usage_kwh', 0)
            ->assertJsonPath('data.buckets.2.average_ct_kwh', null)
            ->assertJsonPath('data.buckets.2.price_ct_kwh', 12.5)
            // A day without any slot is present but empty.
            ->assertJsonPath('data.buckets.3.has_data', false)
            ->assertJsonPath('data.buckets.3.usage_kwh', 0)
            ->assertJsonPath('data.buckets.3.average_ct_kwh', null)
            // The last day has 4 kWh invoiced and 6 kWh provisional.
            ->assertJsonPath('data.buckets.29.from', '2025-06-30T00:00:00')
            ->assertJsonPath('data.buckets.29.usage_kwh', 10)
            ->assertJsonPath('data.buckets.29.unbilled_kwh', 6)
            ->assertJsonPath('data.buckets.29.cost_ct', 187.6)
            ->assertJsonPath('data.buckets.29.unbilled_ct', 112.56)
            ->assertJsonPath('data.totals.usage_kwh', 30.5)
            ->assertJsonPath('data.totals.unbilled_kwh', 6)
            ->assertJsonPath('data.totals.cost_ct', 522.89)
            ->assertJsonPath('data.totals.legal_base_ct', 4)
            ->assertJsonPath('data.totals.has_data', true);

        // Both sources are asked for the same window and resolution.
        $usageRequests = array_values(array_filter(
            $mockClient->getRecordedResponses(),
            static fn ($response): bool => $response->getPendingRequest()->getRequest() instanceof GetUsageRequest,
        ));
        $this->assertCount(2, $usageRequests);

        foreach ($usageRequests as $response) {
            $this->assertSame(
                ['from' => '2025-06-01 00:00:00', 'until' => '2025-07-01 00:00:00', 'resolution' => 'day'],
                $response->getPendingRequest()->query()->all(),
            );
        }
    }

    public function test_invoices_tiling_the_window_yield_the_invoiced_amount(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        $payload = $this->contractPayload();
        $payload['invoices'] = [
            $this->invoice('RE-1', '2025-05-01', '2025-05-31', 9096),
            $this->invoice('RE-2', '2025-06-01', '2025-06-15', 4000, consumption: 150),
            $this->invoice('RE-3', '2025-06-16', '2025-06-30', 4642, consumption: 193),
            // Canceled and replaced — the replacement counts, the canceled one not.
            $this->invoice('RE-3-alt', '2025-06-16', '2025-06-30', 9999, canceledAt: '2025-07-02'),
            $this->invoice('RE-4', '2025-07-01', '2025-07-31', 9444),
        ];

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $payload]),
            GetUsagePeriodRequest::class => new MockResponse(['from' => '2025-03-12 00:00:00', 'until' => '2025-08-01 00:00:00']),
            GetUsageRequest::class => new MockResponse(['data' => []]),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?period=month&date=2025-06-10")
            ->assertOk()
            ->assertJsonPath('data.invoiced.amount_cents', 8642)
            ->assertJsonPath('data.invoiced.consumption_kwh', 343)
            ->assertJsonPath('data.invoiced.invoice_numbers', ['RE-2', 'RE-3']);

        // A single day inside an invoice period is not "invoiced as a whole".
        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?period=day&date=2025-06-10")
            ->assertOk()
            ->assertJsonPath('data.invoiced', null);

        // The year has gaps before May and after July.
        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?period=year&date=2025-06-10")
            ->assertOk()
            ->assertJsonPath('data.invoiced', null);
    }

    public function test_a_custom_window_covers_an_invoice_period_day_by_day(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        $payload = $this->contractPayload();
        $payload['invoices'] = [$this->invoice('RE-9', '2025-05-02', '2025-06-15', 8642, consumption: 343)];

        $mockClient = MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $payload]),
            GetUsagePeriodRequest::class => new MockResponse(['from' => '2025-03-12 00:00:00', 'until' => '2025-08-01 00:00:00']),
            GetUsageRequest::class => new MockResponse(['data' => []]),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?from=2025-05-02&until=2025-06-15")
            ->assertOk()
            ->assertJsonPath('data.period', 'month')
            ->assertJsonPath('data.from', '2025-05-02')
            ->assertJsonPath('data.until', '2025-06-15')
            ->assertJsonCount(45, 'data.buckets')
            ->assertJsonPath('data.buckets.44.from', '2025-06-15T00:00:00')
            ->assertJsonPath('data.invoiced.invoice_numbers', ['RE-9']);

        $this->assertSame(
            ['from' => '2025-05-02 00:00:00', 'until' => '2025-06-16 00:00:00', 'resolution' => 'day'],
            self::lastUsageQuery($mockClient),
        );

        // A long window switches to months.
        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?from=2025-01-01&until=2025-06-30")
            ->assertOk()
            ->assertJsonPath('data.period', 'year')
            ->assertJsonCount(6, 'data.buckets')
            ->assertJsonPath('data.invoiced', null);

        $this->assertSame('month', self::lastUsageQuery($mockClient)['resolution']);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?from=2025-06-30&until=2025-06-01")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['until']);
    }

    public function test_the_default_period_is_the_one_of_the_newest_slot_of_either_source(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetUsagePeriodRequest::class => static fn (PendingRequest $pending): MockResponse => self::bySource(
                $pending,
                // The last invoiced slot ends exactly on the month boundary → June, not July …
                billed: new MockResponse(['from' => '2025-06-01 00:00:00', 'until' => '2025-07-01 00:00:00']),
                // … but the provisional Lastgang already reaches into July.
                unbilled: new MockResponse(['from' => '2025-07-01 00:00:00', 'until' => '2025-07-03 00:00:00']),
            ),
            GetUsageRequest::class => new MockResponse(['data' => []]),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage")
            ->assertOk()
            ->assertJsonPath('data.period', 'month')
            ->assertJsonPath('data.from', '2025-07-01');
    }

    public function test_a_contract_that_is_not_invoiced_yet_shows_the_provisional_lastgang(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetUsagePeriodRequest::class => static fn (PendingRequest $pending): MockResponse => self::bySource(
                $pending,
                billed: new MockResponse([], 404),
                unbilled: new MockResponse(['from' => '2025-06-28 00:00:00', 'until' => '2025-07-02 00:00:00']),
            ),
            GetUsageRequest::class => static fn (PendingRequest $pending): MockResponse => self::bySource(
                $pending,
                billed: new MockResponse(['data' => []]),
                unbilled: new MockResponse(FixtureLoader::raw('customer-data-api/unbilled-usage.json')),
            ),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?period=month&date=2025-06-01")
            ->assertOk()
            ->assertJsonPath('data.available.from', '2025-06-28')
            ->assertJsonPath('data.available.until', '2025-07-01')
            ->assertJsonPath('data.totals.usage_kwh', 6)
            ->assertJsonPath('data.totals.unbilled_kwh', 6)
            ->assertJsonPath('data.totals.has_data', true);
    }

    public function test_a_missing_provisional_source_leaves_the_invoiced_usage_intact(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetUsagePeriodRequest::class => static fn (PendingRequest $pending): MockResponse => self::bySource(
                $pending,
                billed: new MockResponse(['from' => '2025-03-12 00:00:00', 'until' => '2025-07-01 00:00:00']),
                unbilled: new MockResponse(['message' => 'The route could not be found.'], 404),
            ),
            GetUsageRequest::class => static fn (PendingRequest $pending): MockResponse => self::bySource(
                $pending,
                billed: new MockResponse(FixtureLoader::raw('customer-data-api/billed-usage.json')),
                unbilled: new MockResponse(['message' => 'The route could not be found.'], 404),
            ),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?period=month&date=2025-06-10")
            ->assertOk()
            ->assertJsonPath('data.totals.usage_kwh', 24.5)
            ->assertJsonPath('data.totals.unbilled_kwh', 0)
            ->assertJsonPath('data.available.until', '2025-06-30');
    }

    public function test_a_day_and_a_year_ask_kvs_for_hours_and_months(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        $mockClient = MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetUsagePeriodRequest::class => static fn (PendingRequest $pending): MockResponse => self::bySource(
                $pending,
                billed: new MockResponse(['from' => '2024-11-01 00:00:00', 'until' => '2025-07-15 00:00:00']),
                unbilled: new MockResponse([], 404),
            ),
            GetUsageRequest::class => new MockResponse(['data' => []]),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?period=day&date=2025-06-10")
            ->assertOk()
            ->assertJsonCount(24, 'data.buckets')
            ->assertJsonPath('data.buckets.23.from', '2025-06-10T23:00:00')
            ->assertJsonPath('data.buckets.23.until', '2025-06-11T00:00:00')
            ->assertJsonPath('data.totals.has_data', false);

        $this->assertSame('hour', self::lastUsageQuery($mockClient)['resolution']);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?period=year&date=2025-03-01")
            ->assertOk()
            ->assertJsonPath('data.from', '2025-01-01')
            ->assertJsonPath('data.until', '2025-12-31')
            ->assertJsonCount(12, 'data.buckets');

        $this->assertSame('month', self::lastUsageQuery($mockClient)['resolution']);
    }

    public function test_a_contract_without_any_slot_shows_yesterday_empty(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $this->travelTo(CarbonImmutable::parse('2025-06-11 12:00:00'));

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetUsagePeriodRequest::class => new MockResponse([], 404),
            GetUsageRequest::class => new MockResponse(['data' => []]),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?period=day")
            ->assertOk()
            ->assertJsonPath('data.from', '2025-06-10')
            ->assertJsonPath('data.available', null)
            ->assertJsonPath('data.totals.has_data', false);
    }

    public function test_a_kvs_404_on_the_usage_call_becomes_a_404(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetUsagePeriodRequest::class => new MockResponse([], 404),
            GetUsageRequest::class => new MockResponse([], 404),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?date=2025-06-10")
            ->assertNotFound()
            ->assertJsonPath('message', 'Vertrag 123456 wurde im System nicht gefunden. Fehlercode 404.');
    }

    public function test_invalid_parameters_are_rejected(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/usage?period=week&date=not-a-date")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['period', 'date']);
    }

    /**
     * Query of the most recent usage call — the contract lookup for the
     * invoiced amount comes after it.
     *
     * @return array<string, mixed>
     */
    private static function lastUsageQuery(MockClient $mockClient): array
    {
        foreach (array_reverse($mockClient->getRecordedResponses()) as $response) {
            if ($response->getPendingRequest()->getRequest() instanceof GetUsageRequest) {
                return $response->getPendingRequest()->query()->all();
            }
        }

        self::fail('No usage request recorded.');
    }

    /**
     * @return array<string, mixed>
     */
    private function invoice(string $number, string $from, string $until, int $amountCents, ?float $consumption = null, ?string $canceledAt = null): array
    {
        return [
            'id' => crc32($number),
            'invoice_number' => $number,
            'contract_id' => 123456,
            'invoice_date' => $until,
            'invoice_from' => $from,
            'invoice_until' => $until,
            'consumption' => $consumption,
            'amount' => $amountCents,
            'tax_amount' => (int) round($amountCents * 0.19),
            'filename' => "{$number}.pdf",
            'complete_file_path' => "invoices/123456/{$number}.pdf",
            'canceled_at' => $canceledAt,
        ];
    }

    private static function bySource(PendingRequest $pending, MockResponse $billed, MockResponse $unbilled): MockResponse
    {
        return str_contains($pending->getRequest()->resolveEndpoint(), UsageSource::Unbilled->path()) ? $unbilled : $billed;
    }
}
