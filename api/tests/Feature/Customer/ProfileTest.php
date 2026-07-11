<?php

declare(strict_types=1);

namespace Tests\Feature\Customer;

use App\Models\User;
use App\Notifications\EmailChangedNotification;
use App\Notifications\PasswordChangedNotification;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

final class ProfileTest extends CustomerTestCase
{
    public function test_the_profile_is_shown(): void
    {
        $user = User::factory()->create(['name' => 'Max Mustermann']);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/profile")
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.name', 'Max Mustermann')
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.customer_number', $user->customer_number)
            ->assertJsonPath('data.email_verified', true)
            ->assertJsonPath('data.password_set', true);
    }

    public function test_a_foreign_user_cannot_see_the_profile(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $this->actingAs($user)
            ->getJson("/api/customers/{$otherUser->id}/profile")
            ->assertForbidden();
    }

    public function test_updating_the_email_resets_verification_and_notifies_both_addresses(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $oldEmail = $user->email;

        $this->actingAs($user)
            ->putJson("/api/customers/{$user->id}/profile/email", ['email' => 'neu@example.org'])
            ->assertOk()
            ->assertJsonPath('data.email', 'neu@example.org')
            ->assertJsonPath('data.email_verified', false)
            ->assertJsonPath(
                'message',
                'Ihre E-Mail-Adresse wurde aktualisiert. Bitte bestätigen Sie die neue E-Mail-Adresse. Hierzu haben wir Ihnen eine E-Mail an die neue Adresse geschickt.',
            );

        $user->refresh();
        $this->assertSame('neu@example.org', $user->email);
        $this->assertNull($user->email_verified_at);

        // The OLD address is informed about the change...
        Notification::assertSentOnDemand(
            EmailChangedNotification::class,
            fn (EmailChangedNotification $notification, array $channels, AnonymousNotifiable $notifiable): bool => ($notifiable->routes['mail'] ?? null) === $oldEmail
                && $notification->newEmail === 'neu@example.org',
        );

        // ...and the user must verify the new one.
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_the_email_must_be_unique(): void
    {
        Notification::fake();

        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $this->actingAs($user)
            ->putJson("/api/customers/{$user->id}/profile/email", ['email' => $otherUser->email])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        Notification::assertNothingSent();
    }

    public function test_the_password_can_be_updated_with_the_current_password(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson("/api/customers/{$user->id}/profile/password", [
                'current_password' => 'password',
                'password' => 'NeuesPasswort123',
                'password_confirmation' => 'NeuesPasswort123',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Ihr Passwort wurde aktualisiert.');

        $user->refresh();
        $this->assertIsString($user->password);
        $this->assertTrue(Hash::check('NeuesPasswort123', $user->password));

        Notification::assertSentTo($user, PasswordChangedNotification::class);
    }

    public function test_a_wrong_current_password_is_rejected(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson("/api/customers/{$user->id}/profile/password", [
                'current_password' => 'falsches-passwort',
                'password' => 'NeuesPasswort123',
                'password_confirmation' => 'NeuesPasswort123',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $user->refresh();
        $this->assertIsString($user->password);
        $this->assertTrue(Hash::check('password', $user->password));

        Notification::assertNothingSent();
    }
}
