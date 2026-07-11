<?php

declare(strict_types=1);

namespace Tests\Feature\Customer;

use App\Integrations\CustomerDataApi\Requests\GetContractsByIdsRequest;
use Exception;
use Saloon\Exceptions\Request\FatalRequestException;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Saloon\Http\PendingRequest;

/**
 * The StaleOnErrorCache keeps contracts readable from the last known good
 * copy while the customer-data-api is unavailable.
 */
final class ContractsStaleFallbackTest extends CustomerTestCase
{
    public function test_contracts_are_served_from_the_last_known_good_copy_during_an_outage(): void
    {
        $user = $this->customerWithContract();

        $this->mockOneSuccessThenFailWith(new MockResponse([], 500));

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.0.contract_number', 123456);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.0.contract_number', 123456);
    }

    public function test_a_connection_failure_also_serves_the_cached_copy(): void
    {
        $user = $this->customerWithContract();

        $this->mockOneSuccessThenFailWith(
            (new MockResponse)->throw(
                fn (PendingRequest $pendingRequest) => new FatalRequestException(new Exception('Connection refused'), $pendingRequest),
            ),
        );

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}")
            ->assertOk();

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.0.contract_number', 123456);
    }

    public function test_an_outage_without_a_cached_copy_still_fails(): void
    {
        $user = $this->customerWithContract();

        MockClient::global([
            GetContractsByIdsRequest::class => new MockResponse([], 500),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}")
            ->assertStatus(500);
    }

    /**
     * First KVS batch call succeeds (fills the stale cache), every later call
     * fails with the given response.
     */
    private function mockOneSuccessThenFailWith(MockResponse $failure): void
    {
        $calls = 0;

        MockClient::global([
            GetContractsByIdsRequest::class => function () use (&$calls, $failure): MockResponse {
                return $calls++ === 0
                    ? new MockResponse(['data' => [$this->contractPayload()]])
                    : $failure;
            },
        ]);
    }
}
