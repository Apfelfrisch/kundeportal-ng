<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Notifications\EmailChangedNotification;
use App\Notifications\PasswordChangedNotification;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

final class AdminProfileTest extends AdminTestCase
{
    public function test_the_own_profile_is_shown(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Frau Admin']);

        $this->actingAs($admin)
            ->getJson('/api/admin/profile')
            ->assertOk()
            ->assertJsonPath('data.id', $admin->id)
            ->assertJsonPath('data.name', 'Frau Admin')
            ->assertJsonPath('data.email', $admin->email)
            ->assertJsonPath('data.email_verified', true)
            ->assertJsonPath('data.password_set', true);
    }

    public function test_updating_the_email_resets_verification_and_notifies_both_addresses(): void
    {
        Notification::fake();

        $admin = $this->admin();
        $oldEmail = $admin->email;

        $this->actingAs($admin)
            ->putJson('/api/admin/profile/email', ['email' => 'neu@example.org'])
            ->assertOk()
            ->assertJsonPath('data.email', 'neu@example.org')
            ->assertJsonPath('data.email_verified', false);

        $admin->refresh();
        $this->assertSame('neu@example.org', $admin->email);
        $this->assertNull($admin->email_verified_at);

        Notification::assertSentOnDemand(
            EmailChangedNotification::class,
            fn (EmailChangedNotification $notification, array $channels, AnonymousNotifiable $notifiable): bool => ($notifiable->routes['mail'] ?? null) === $oldEmail
                && $notification->newEmail === 'neu@example.org',
        );

        Notification::assertSentTo($admin, VerifyEmailNotification::class);
    }

    public function test_an_admin_with_unverified_email_still_reaches_the_admin_area(): void
    {
        $admin = User::factory()->admin()->unverified()->create();

        $this->actingAs($admin)
            ->getJson('/api/admin/profile')
            ->assertOk()
            ->assertJsonPath('data.email_verified', false);

        $this->actingAs($admin)
            ->getJson('/api/admin/dashboard')
            ->assertOk();
    }

    public function test_the_email_must_be_unique_but_the_own_address_may_be_resubmitted(): void
    {
        Notification::fake();

        $admin = $this->admin();
        $otherUser = User::factory()->create();

        $this->actingAs($admin)
            ->putJson('/api/admin/profile/email', ['email' => $otherUser->email])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->actingAs($admin)
            ->putJson('/api/admin/profile/email', ['email' => $admin->email])
            ->assertOk();
    }

    public function test_the_password_can_be_updated_with_the_current_password(): void
    {
        Notification::fake();

        $admin = $this->admin();

        $this->actingAs($admin)
            ->putJson('/api/admin/profile/password', [
                'current_password' => 'password',
                'password' => 'NeuesPasswort123',
                'password_confirmation' => 'NeuesPasswort123',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Ihr Passwort wurde aktualisiert.');

        $admin->refresh();
        $this->assertIsString($admin->password);
        $this->assertTrue(Hash::check('NeuesPasswort123', $admin->password));

        Notification::assertSentTo($admin, PasswordChangedNotification::class);
    }

    public function test_a_wrong_current_password_is_rejected(): void
    {
        Notification::fake();

        $admin = $this->admin();

        $this->actingAs($admin)
            ->putJson('/api/admin/profile/password', [
                'current_password' => 'falsch',
                'password' => 'NeuesPasswort123',
                'password_confirmation' => 'NeuesPasswort123',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        Notification::assertNothingSent();
    }
}
