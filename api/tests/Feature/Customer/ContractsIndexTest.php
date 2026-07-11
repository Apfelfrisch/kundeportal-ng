<?php

declare(strict_types=1);

namespace Tests\Feature\Customer;

use App\Integrations\CustomerDataApi\Requests\GetContractsByIdsRequest;
use App\Models\User;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;

final class ContractsIndexTest extends CustomerTestCase
{
    public function test_a_customer_gets_their_contract_summaries(): void
    {
        $user = $this->customerWithContract();

        MockClient::global([
            GetContractsByIdsRequest::class => new MockResponse(['data' => [$this->contractPayload()]]),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.contract_number', 123456)
            ->assertJsonPath('data.0.status.label', 'In Belieferung')
            ->assertJsonPath('data.0.tariff', 'Klassik Strom')
            ->assertJsonPath('data.0.delivery_address.city', 'Hamburg')
            ->assertJsonPath('data.0.delivery_address.street', 'Musterweg')
            ->assertJsonPath('data.0.meter_number', '1APBN0012345')
            ->assertJsonPath('data.0.malo_id', 'DE0012345678901234567890123456789')
            ->assertJsonPath('data.0.delivery_start', '2024-07-01')
            ->assertJsonPath('data.0.delivery_end', null);
    }

    public function test_without_assignments_the_list_is_empty_and_the_api_is_not_called(): void
    {
        $user = User::factory()->create();

        // No expectations registered: any KVS call would fail the test.
        MockClient::global([]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_unconfirmed_assignments_do_not_count(): void
    {
        $user = $this->customerWithContract(confirmed: false);

        MockClient::global([]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_a_customer_cannot_read_another_users_contracts(): void
    {
        $user = User::factory()->create();
        $otherUser = $this->customerWithContract();

        $this->actingAs($user)
            ->getJson("/api/customers/{$otherUser->id}")
            ->assertForbidden()
            ->assertJsonPath('message', 'Sie dürfen nicht für diesen Benutzer handeln.');
    }

    public function test_an_administrator_can_act_for_a_customer(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = $this->customerWithContract();

        MockClient::global([
            GetContractsByIdsRequest::class => new MockResponse(['data' => [$this->contractPayload()]]),
        ]);

        $this->actingAs($admin)
            ->getJson("/api/customers/{$customer->id}")
            ->assertOk()
            ->assertJsonPath('data.0.contract_number', 123456);
    }

    public function test_guests_are_rejected(): void
    {
        $user = $this->customerWithContract();

        $this->getJson("/api/customers/{$user->id}")
            ->assertUnauthorized();
    }

    public function test_users_without_a_password_get_the_structured_409(): void
    {
        $user = User::factory()->withoutPassword()->create();

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}")
            ->assertStatus(409)
            ->assertJsonPath('code', 'password_not_set');
    }

    public function test_unverified_users_are_rejected_with_403(): void
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}")
            ->assertForbidden();
    }
}
