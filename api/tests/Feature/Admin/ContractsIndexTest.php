<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Integrations\CustomerDataApi\Requests\GetContractRequest;
use App\Integrations\CustomerDataApi\Requests\GetContractsByIdsRequest;
use App\Integrations\CustomerDataApi\Requests\GetContractsRequest;
use App\Models\ContractToUser;
use App\Models\User;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;

final class ContractsIndexTest extends AdminTestCase
{
    public function test_the_plain_listing_passes_the_kvs_page_through(): void
    {
        MockClient::global([
            GetContractsRequest::class => new MockResponse($this->contractsPagePayload(
                [$this->contractPayload(), $this->contractPayload(['id' => 654321])],
                currentPage: 2,
                lastPage: 7,
                total: 152,
            )),
        ]);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/contracts?page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.contract_number', 123456)
            ->assertJsonPath('data.0.billing_contact.first_name', 'Max')
            ->assertJsonPath('data.0.billing_contact.last_name', 'Mustermann')
            ->assertJsonPath('data.0.address.city', 'Hamburg')
            ->assertJsonPath('data.0.assignment', null)
            ->assertJsonPath('data.1.contract_number', 654321)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.last_page', 7)
            ->assertJsonPath('meta.total', 152);
    }

    public function test_the_listing_is_enriched_with_unconfirmed_local_assignments(): void
    {
        $user = User::factory()->create();
        $assignment = ContractToUser::factory()
            ->for($user)
            ->unconfirmed()
            ->create(['contract_number' => 123456]);

        MockClient::global([
            GetContractsRequest::class => new MockResponse($this->contractsPagePayload([$this->contractPayload()])),
        ]);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/contracts')
            ->assertOk()
            ->assertJsonPath('data.0.assignment.id', $assignment->id)
            ->assertJsonPath('data.0.assignment.user_id', $user->id)
            ->assertJsonPath('data.0.assignment.confirmed', false)
            ->assertJsonPath('data.0.assignment.user.name', $user->name)
            ->assertJsonPath('data.0.assignment.user.email', $user->email);
    }

    public function test_searching_by_contract_number_fetches_the_single_contract(): void
    {
        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/contracts?contract_number=123456')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.contract_number', 123456)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_an_unknown_contract_number_yields_an_empty_listing(): void
    {
        MockClient::global([
            GetContractRequest::class => new MockResponse(['message' => 'not found'], 404),
        ]);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/contracts?contract_number=999999')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 0);
    }

    public function test_searching_by_name_batches_the_matched_users_contracts(): void
    {
        $user = User::factory()->create(['name' => 'Erika Musterfrau']);
        ContractToUser::factory()->for($user)->create(['contract_number' => 123456]);
        ContractToUser::factory()->for($user)->unconfirmed()->create(['contract_number' => 654321]);

        // An unrelated user's contract must not show up.
        ContractToUser::factory()->create(['contract_number' => 111111]);

        MockClient::global([
            GetContractsByIdsRequest::class => new MockResponse([
                'data' => [$this->contractPayload(), $this->contractPayload(['id' => 654321])],
            ]),
        ]);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/contracts?name=Musterfrau')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.contract_number', 123456)
            ->assertJsonPath('data.1.contract_number', 654321)
            ->assertJsonPath('meta.total', 2);
    }

    public function test_searching_by_email_uses_the_batch_call_and_includes_unconfirmed_assignments(): void
    {
        $user = User::factory()->create(['email' => 'erika@example.org']);
        ContractToUser::factory()->for($user)->unconfirmed()->create(['contract_number' => 123456]);

        MockClient::global([
            GetContractsByIdsRequest::class => new MockResponse([
                'data' => [$this->contractPayload()],
            ]),
        ]);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/contracts?email=erika@')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.contract_number', 123456)
            ->assertJsonPath('data.0.assignment.confirmed', false);
    }

    public function test_a_user_search_without_local_matches_never_hits_the_api(): void
    {
        // No expectations registered: any KVS call would fail the test.
        MockClient::global([]);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/contracts?name=niemand')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 0);
    }

    public function test_the_user_filter_reduces_the_page_to_assigned_contracts(): void
    {
        ContractToUser::factory()->unconfirmed()->create(['contract_number' => 123456]);

        MockClient::global([
            GetContractsRequest::class => new MockResponse($this->contractsPagePayload([
                $this->contractPayload(),
                $this->contractPayload(['id' => 654321]),
            ])),
        ]);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/contracts?user_filter=with_user')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.contract_number', 123456);
    }

    public function test_the_user_filter_can_reduce_the_page_to_unassigned_contracts(): void
    {
        ContractToUser::factory()->create(['contract_number' => 123456]);

        MockClient::global([
            GetContractsRequest::class => new MockResponse($this->contractsPagePayload([
                $this->contractPayload(),
                $this->contractPayload(['id' => 654321]),
            ])),
        ]);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/contracts?user_filter=without_user')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.contract_number', 654321);
    }
}
