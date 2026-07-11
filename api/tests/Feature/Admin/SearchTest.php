<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\ContractToUser;
use App\Models\User;

final class SearchTest extends AdminTestCase
{
    public function test_a_contract_with_a_confirmed_assignment_is_found(): void
    {
        $assignment = ContractToUser::factory()->create(['contract_number' => 123456]);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/search/contract?contract_number=123456')
            ->assertOk()
            ->assertJsonPath('data.contract_number', 123456)
            ->assertJsonPath('data.user_id', $assignment->user_id);
    }

    public function test_an_unconfirmed_assignment_is_found_too(): void
    {
        $assignment = ContractToUser::factory()->unconfirmed()->create(['contract_number' => 123456]);

        $this->actingAs($this->admin())
            ->getJson('/api/admin/search/contract?contract_number=123456')
            ->assertOk()
            ->assertJsonPath('data.contract_number', 123456)
            ->assertJsonPath('data.user_id', $assignment->user_id);
    }

    public function test_a_contract_without_assignment_yields_the_german_404(): void
    {
        $this->actingAs($this->admin())
            ->getJson('/api/admin/search/contract?contract_number=999999')
            ->assertNotFound()
            ->assertJsonPath('message', 'Keinen Vertrag mit der Nummer 999999 gefunden.');
    }

    public function test_the_contract_number_is_required(): void
    {
        $this->actingAs($this->admin())
            ->getJson('/api/admin/search/contract')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('contract_number');
    }

    public function test_an_existing_user_is_found(): void
    {
        $user = User::factory()->create();

        $this->actingAs($this->admin())
            ->getJson("/api/admin/search/user?user_id={$user->id}")
            ->assertOk()
            ->assertJsonPath('data.user_id', $user->id);
    }

    public function test_an_unknown_user_yields_the_german_404(): void
    {
        $this->actingAs($this->admin())
            ->getJson('/api/admin/search/user?user_id=999999')
            ->assertNotFound()
            ->assertJsonPath('message', 'Kein Benutzer mit der Stammnummer 999999 gefunden.');
    }

    public function test_the_user_id_is_required(): void
    {
        $this->actingAs($this->admin())
            ->getJson('/api/admin/search/user')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('user_id');
    }
}
