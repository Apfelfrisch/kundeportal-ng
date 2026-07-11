<?php

declare(strict_types=1);

namespace Tests\Feature\Charts;

use App\Integrations\CustomerDataApi\Requests\GetBilledLoadProfilesRequest;
use App\Integrations\CustomerDataApi\Requests\GetContractRequest;
use App\Integrations\CustomerDataApi\Requests\GetEdiLoadProfilesRequest;
use App\Integrations\CustomerDataApi\Requests\GetLastBillingDateRequest;
use App\Integrations\CustomerDataApi\Requests\GetLastReadingDateRequest;
use Carbon\CarbonImmutable;
use Exception;
use Saloon\Exceptions\Request\FatalRequestException;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Saloon\Http\PendingRequest;
use Tests\Fixtures\FixtureLoader;

/**
 * The StaleOnErrorCache keeps load profile days readable from the last known
 * good copy while the customer-data-api is unavailable. The date lookups are
 * cached too, so an outage replays the same day a healthy visit showed.
 */
final class LoadProfilesStaleFallbackTest extends ChartsTestCase
{
    public function test_the_billed_day_survives_a_full_outage(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        // Every KVS endpoint answers once, then the whole API is down.
        MockClient::global([
            GetContractRequest::class => self::oneSuccessThen500(new MockResponse(['data' => $this->contractPayload()])),
            GetLastBillingDateRequest::class => self::oneSuccessThen500(new MockResponse(['last_billing_date' => '2025-06-10'])),
            GetBilledLoadProfilesRequest::class => self::oneSuccessThen500(new MockResponse(FixtureLoader::raw('customer-data-api/billed-load-profiles.json'))),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles")
            ->assertOk()
            ->assertJsonPath('data.date', '2025-06-10')
            ->assertJsonCount(2, 'data.entries');

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles")
            ->assertOk()
            ->assertJsonPath('data.date', '2025-06-10')
            ->assertJsonCount(2, 'data.entries');
    }

    public function test_the_edi_day_survives_a_connection_failure(): void
    {
        $this->enableFeature('edi-load-profiles');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => self::oneSuccessThen(new MockResponse(['data' => $this->contractPayload()]), self::connectionFailure()),
            GetLastReadingDateRequest::class => self::oneSuccessThen(new MockResponse(['last_reading_date' => '2025-06-10']), self::connectionFailure()),
            GetEdiLoadProfilesRequest::class => self::oneSuccessThen(new MockResponse(FixtureLoader::raw('customer-data-api/edi-load-profiles.json')), self::connectionFailure()),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/edi-load-profiles")
            ->assertOk()
            ->assertJsonPath('data.date', '2025-06-10');

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/edi-load-profiles")
            ->assertOk()
            ->assertJsonPath('data.date', '2025-06-10');
    }

    public function test_a_connection_failure_on_the_date_lookup_falls_back_to_yesterday_without_a_cached_date(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $this->travelTo(CarbonImmutable::parse('2025-06-11 12:00:00'));

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetLastBillingDateRequest::class => self::connectionFailure(),
            GetBilledLoadProfilesRequest::class => new MockResponse(FixtureLoader::raw('customer-data-api/billed-load-profiles.json')),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles")
            ->assertOk()
            ->assertJsonPath('data.date', '2025-06-10');
    }

    public function test_an_outage_without_a_cached_window_still_fails(): void
    {
        $this->enableFeature('dynamic-electric-prices');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
            GetBilledLoadProfilesRequest::class => new MockResponse([], 500),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/billed-load-profiles?date=2025-06-10")
            ->assertStatus(500);
    }

    private static function oneSuccessThen500(MockResponse $success): callable
    {
        return self::oneSuccessThen($success, new MockResponse([], 500));
    }

    /**
     * @return callable(): MockResponse
     */
    private static function oneSuccessThen(MockResponse $success, MockResponse $failure): callable
    {
        $calls = 0;

        return function () use (&$calls, $success, $failure): MockResponse {
            return $calls++ === 0 ? $success : $failure;
        };
    }

    private static function connectionFailure(): MockResponse
    {
        return (new MockResponse)->throw(
            fn (PendingRequest $pendingRequest) => new FatalRequestException(new Exception('Connection refused'), $pendingRequest),
        );
    }
}
