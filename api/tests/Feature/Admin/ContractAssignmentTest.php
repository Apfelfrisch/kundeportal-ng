<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Integrations\CustomerDataApi\Requests\GetContractRequest;
use App\Models\ContractToUser;
use App\Models\User;
use App\Notifications\ContractAssignedNotification;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;

final class ContractAssignmentTest extends AdminTestCase
{
    public function test_the_assignment_is_auto_confirmed_when_the_contract_email_matches_the_user(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'alt@example.org']);

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $this->actingAs($this->admin())
            ->postJson('/api/admin/contract-assignments', [
                'user_id' => $user->id,
                'contract_number' => 123456,
            ])
            ->assertCreated()
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.contract_number', 123456)
            ->assertJsonPath('data.confirmed', true)
            ->assertJsonPath('message', "Vertrag 123456 wurde dem Benutzer {$user->name} zugewiesen.");

        Notification::assertNothingSent();
    }

    public function test_a_differing_contract_email_creates_an_unconfirmed_assignment_and_mails_the_contract_owner(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'neu@example.org']);

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $this->actingAs($this->admin())
            ->postJson('/api/admin/contract-assignments', [
                'user_id' => $user->id,
                'contract_number' => 123456,
            ])
            ->assertCreated()
            ->assertJsonPath('data.confirmed', false);

        $assignment = ContractToUser::withUnconfirmed()
            ->where('contract_number', 123456)
            ->firstOrFail();
        $this->assertFalse($assignment->confirmed);

        Notification::assertSentOnDemand(
            ContractAssignedNotification::class,
            fn (ContractAssignedNotification $notification, array $channels, AnonymousNotifiable $notifiable): bool => ($notifiable->routes['mail'] ?? null) === 'alt@example.org'
                && $notification->contractNumber === 123456
                && $notification->userName === $user->name,
        );
    }

    public function test_a_missing_kvs_contract_creates_an_unconfirmed_assignment_without_mail(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['message' => 'not found'], 404),
        ]);

        $this->actingAs($this->admin())
            ->postJson('/api/admin/contract-assignments', [
                'user_id' => $user->id,
                'contract_number' => 999999,
            ])
            ->assertCreated()
            ->assertJsonPath('data.confirmed', false);

        Notification::assertNothingSent();
    }

    public function test_an_already_assigned_contract_is_rejected_even_when_unconfirmed(): void
    {
        Notification::fake();

        ContractToUser::factory()->unconfirmed()->create(['contract_number' => 123456]);
        $user = User::factory()->create();

        $this->actingAs($this->admin())
            ->postJson('/api/admin/contract-assignments', [
                'user_id' => $user->id,
                'contract_number' => 123456,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('contract_number')
            ->assertJsonPath('errors.contract_number.0', 'Der Vertrag 123456 ist bereits einem Benutzer zugewiesen.');

        Notification::assertNothingSent();
    }

    public function test_an_unknown_user_is_rejected(): void
    {
        $this->actingAs($this->admin())
            ->postJson('/api/admin/contract-assignments', [
                'user_id' => 999999,
                'contract_number' => 123456,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('user_id');
    }

    public function test_an_unconfirmed_assignment_can_be_removed(): void
    {
        $assignment = ContractToUser::factory()->unconfirmed()->create(['contract_number' => 123456]);

        $this->actingAs($this->admin())
            ->deleteJson("/api/admin/contract-assignments/{$assignment->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Zuweisung für Vertrag 123456 wurde entfernt.');

        $this->assertDatabaseMissing('contract_to_users', ['id' => $assignment->id]);
    }

    public function test_a_confirmed_assignment_can_be_removed(): void
    {
        $assignment = ContractToUser::factory()->create(['contract_number' => 123456]);

        $this->actingAs($this->admin())
            ->deleteJson("/api/admin/contract-assignments/{$assignment->id}")
            ->assertOk();

        $this->assertDatabaseMissing('contract_to_users', ['id' => $assignment->id]);
    }

    public function test_removing_an_unknown_assignment_yields_404(): void
    {
        $this->actingAs($this->admin())
            ->deleteJson('/api/admin/contract-assignments/999999')
            ->assertNotFound()
            ->assertJsonPath('message', 'Diese Zuweisung existiert nicht.');
    }
}
