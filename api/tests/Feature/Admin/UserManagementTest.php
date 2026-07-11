<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Integrations\CustomerDataApi\Requests\GetContractRequest;
use App\Models\CompanyMessage;
use App\Models\CompanyUploadedFile;
use App\Models\ContractToUser;
use App\Models\CustomerMessage;
use App\Models\CustomerUploadedFile;
use App\Models\User;
use App\Models\UserMailLog;
use App\Notifications\AccountSetupNotification;
use App\Notifications\ContractAssignedNotification;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;

final class UserManagementTest extends AdminTestCase
{
    public function test_a_customer_user_is_created_with_an_auto_confirmed_assignment_when_the_contract_email_matches(): void
    {
        Notification::fake();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $this->actingAs($this->admin())
            ->postJson('/api/admin/users', [
                'name' => 'Erika Musterfrau',
                // Matches the fixture's mail_address (case-insensitive).
                'email' => 'ALT@example.org',
                'contract_number' => 123456,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Erika Musterfrau')
            ->assertJsonPath('data.password_set', false)
            ->assertJsonPath('data.contract_assignments.0.contract_number', 123456)
            ->assertJsonPath('data.contract_assignments.0.confirmed', true);

        $user = User::query()->where('email', 'ALT@example.org')->firstOrFail();
        $this->assertFalse($user->hasPassword());
        $this->assertFalse($user->admin);

        $assignment = ContractToUser::withUnconfirmed()->where('user_id', $user->id)->firstOrFail();
        $this->assertTrue($assignment->confirmed);

        Notification::assertNothingSent();
    }

    public function test_a_differing_contract_email_leaves_the_assignment_unconfirmed_and_mails_the_contract_owner(): void
    {
        Notification::fake();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $this->actingAs($this->admin())
            ->postJson('/api/admin/users', [
                'name' => 'Erika Musterfrau',
                'email' => 'neu@example.org',
                'contract_number' => 123456,
                'send_mail' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.contract_assignments.0.confirmed', false);

        $user = User::query()->where('email', 'neu@example.org')->firstOrFail();

        // The setup mail goes to the new user ...
        Notification::assertSentTo($user, AccountSetupNotification::class);

        // ... and the confirmation request to the address stored on the contract.
        Notification::assertSentOnDemand(
            ContractAssignedNotification::class,
            fn (ContractAssignedNotification $notification, array $channels, AnonymousNotifiable $notifiable): bool => ($notifiable->routes['mail'] ?? null) === 'alt@example.org'
                && $notification->contractNumber === 123456,
        );
    }

    public function test_a_user_can_be_created_without_contract_and_without_mail(): void
    {
        Notification::fake();
        MockClient::global([]);

        $this->actingAs($this->admin())
            ->postJson('/api/admin/users', [
                'name' => 'Erika Musterfrau',
                'email' => 'erika@example.org',
            ])
            ->assertCreated()
            ->assertJsonCount(0, 'data.contract_assignments');

        Notification::assertNothingSent();
    }

    public function test_duplicate_emails_are_rejected(): void
    {
        $existing = User::factory()->create();

        $this->actingAs($this->admin())
            ->postJson('/api/admin/users', [
                'name' => 'Erika Musterfrau',
                'email' => $existing->email,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_destroy_cascades_over_all_related_records_of_the_user(): void
    {
        $admin = $this->admin();

        $user = User::factory()->create();
        $assignment = ContractToUser::factory()->for($user)->unconfirmed()->create();

        $ticket = CustomerMessage::factory()->create(['customer_user_id' => (string) $user->id]);
        $customerFile = CustomerUploadedFile::factory()->create([
            'customer_user_id' => $user->id,
            'customer_message_id' => $ticket->id,
            'user_id' => $user->id,
        ]);

        $companyMessage = CompanyMessage::factory()->create(['customer_user_id' => (string) $user->id]);
        $companyFile = CompanyUploadedFile::factory()->create([
            'customer_user_id' => $user->id,
            'company_message_id' => $companyMessage->id,
            'user_id' => $admin->id,
        ]);

        $mailLog = UserMailLog::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'type' => 'account_setup',
            'subject' => 'Account einrichten',
        ]);

        // Records of another user must survive the cascade.
        $otherTicket = CustomerMessage::factory()->create();

        $this->actingAs($admin)
            ->deleteJson("/api/admin/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('message', "Benutzer {$user->name} wurde gelöscht.");

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('contract_to_users', ['id' => $assignment->id]);

        $this->assertSoftDeleted('customer_messages', ['id' => $ticket->id]);
        $this->assertSoftDeleted('customer_uploaded_files', ['id' => $customerFile->id]);
        $this->assertSoftDeleted('company_messages', ['id' => $companyMessage->id]);
        $this->assertSoftDeleted('company_uploaded_files', ['id' => $companyFile->id]);
        $this->assertSoftDeleted('user_mail_logs', ['id' => $mailLog->id]);

        $this->assertNotSoftDeleted('customer_messages', ['id' => $otherTicket->id]);
    }

    public function test_setup_mail_sends_the_account_invitation_to_users_without_password(): void
    {
        Notification::fake();

        $user = User::factory()->withoutPassword()->create();

        $this->actingAs($this->admin())
            ->postJson("/api/admin/users/{$user->id}/setup-mail")
            ->assertOk()
            ->assertJsonPath('message', "Einladungs-Mail wurde an {$user->name} gesendet.");

        Notification::assertSentTo($user, AccountSetupNotification::class);
        Notification::assertNotSentTo($user, ResetPasswordNotification::class);
    }

    public function test_setup_mail_sends_a_password_reset_to_users_with_password(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->actingAs($this->admin())
            ->postJson("/api/admin/users/{$user->id}/setup-mail")
            ->assertOk()
            ->assertJsonPath('message', "Passwort-Reset-Mail wurde an {$user->name} gesendet.");

        Notification::assertSentTo($user, ResetPasswordNotification::class);
        Notification::assertNotSentTo($user, AccountSetupNotification::class);
    }

    public function test_unknown_users_yield_404(): void
    {
        $this->actingAs($this->admin())
            ->deleteJson('/api/admin/users/999999')
            ->assertNotFound();

        $this->actingAs($this->admin())
            ->postJson('/api/admin/users/999999/setup-mail')
            ->assertNotFound();
    }
}
