<?php

declare(strict_types=1);

namespace Tests\Feature\ChangeData;

use App\Models\User;
use Illuminate\Support\Facades\Notification;
use Saloon\Http\Faking\MockClient;

final class ChangeRequestAuthorizationTest extends ChangeDataTestCase
{
    public function test_a_guest_gets_401(): void
    {
        MockClient::global([]);

        $user = $this->customerWithContract();

        $this->postJson(
            "/api/customers/{$user->id}/contracts/".self::CONTRACT_NUMBER.'/change-requests/bank',
            [],
        )->assertUnauthorized();
    }

    public function test_a_foreign_user_gets_403(): void
    {
        Notification::fake();
        MockClient::global([]);

        $owner = $this->customerWithContract();
        $foreignUser = User::factory()->create();

        $this->actingAs($foreignUser)->postJson(
            "/api/customers/{$owner->id}/contracts/".self::CONTRACT_NUMBER.'/change-requests/bank',
            [
                'iban' => 'DE02120300000000202051',
                'bank' => 'Neue Bank AG',
                'bank_account_owner' => 'Erika Mustermann',
            ],
        )->assertForbidden();

        $this->assertDatabaseCount('customer_messages', 0);
        Notification::assertNothingSent();
    }

    public function test_an_unconfirmed_contract_assignment_gets_403(): void
    {
        Notification::fake();
        MockClient::global([]);

        $user = $this->customerWithContract(confirmed: false);

        $this->postChangeRequest($user, 'bank', [
            'iban' => 'DE02120300000000202051',
            'bank' => 'Neue Bank AG',
            'bank_account_owner' => 'Erika Mustermann',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Sie haben keinen Zugriff auf diesen Vertrag.');

        $this->assertDatabaseCount('customer_messages', 0);
    }

    public function test_the_contact_type_is_not_a_change_request(): void
    {
        MockClient::global([]);

        $user = $this->customerWithContract();

        $this->postChangeRequest($user, 'contact', ['message' => 'Hallo'])
            ->assertNotFound();
    }

    public function test_an_unknown_type_gets_404(): void
    {
        MockClient::global([]);

        $user = $this->customerWithContract();

        $this->postChangeRequest($user, 'unknown-type', [])
            ->assertNotFound();
    }
}
