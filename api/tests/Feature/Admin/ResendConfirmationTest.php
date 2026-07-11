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

final class ResendConfirmationTest extends AdminTestCase
{
    public function test_the_confirmation_mail_is_resent_to_the_contract_email(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        ContractToUser::factory()->for($user)->unconfirmed()->create(['contract_number' => 123456]);

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $this->actingAs($this->admin())
            ->postJson('/api/admin/contracts/123456/resend-confirmation')
            ->assertOk()
            ->assertJsonPath('message', 'Bestätigungsmail für Vertrag 123456 wurde erneut versandt.');

        Notification::assertSentOnDemand(
            ContractAssignedNotification::class,
            fn (ContractAssignedNotification $notification, array $channels, AnonymousNotifiable $notifiable): bool => ($notifiable->routes['mail'] ?? null) === 'alt@example.org'
                && $notification->contractNumber === 123456
                && $notification->userName === $user->name,
        );
    }

    public function test_a_confirmed_assignment_cannot_be_resent(): void
    {
        Notification::fake();

        ContractToUser::factory()->create(['contract_number' => 123456]);

        $this->actingAs($this->admin())
            ->postJson('/api/admin/contracts/123456/resend-confirmation')
            ->assertNotFound()
            ->assertJsonPath('message', 'Zu diesem Vertrag liegt keine unbestätigte Zuweisung vor.');

        Notification::assertNothingSent();
    }

    public function test_a_contract_without_email_address_is_rejected(): void
    {
        Notification::fake();

        ContractToUser::factory()->unconfirmed()->create(['contract_number' => 123456]);

        MockClient::global([
            GetContractRequest::class => new MockResponse([
                'data' => $this->contractPayload(['mail_address' => null]),
            ]),
        ]);

        $this->actingAs($this->admin())
            ->postJson('/api/admin/contracts/123456/resend-confirmation')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('contract_number');

        Notification::assertNothingSent();
    }
}
