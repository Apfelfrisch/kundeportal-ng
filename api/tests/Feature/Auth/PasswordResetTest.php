<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\PasswordChangedNotification;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

final class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:3000');
    }

    public function test_reset_link_is_sent_to_existing_users(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath(
                'message',
                'Wenn ein Konto mit dieser E-Mail-Adresse existiert, haben wir Ihnen einen Link zum Zurücksetzen des Passworts geschickt.',
            );

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_unknown_email_gets_the_same_generic_response(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/forgot-password', ['email' => 'unbekannt@example.com'])
            ->assertOk()
            ->assertJsonPath(
                'message',
                'Wenn ein Konto mit dieser E-Mail-Adresse existiert, haben wir Ihnen einen Link zum Zurücksetzen des Passworts geschickt.',
            );

        Notification::assertNothingSent();
    }

    public function test_password_can_be_reset_with_a_valid_token(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])->assertOk();

        $token = null;

        Notification::assertSentTo(
            $user,
            ResetPasswordNotification::class,
            static function (ResetPasswordNotification $notification) use (&$token): bool {
                $token = $notification->token;

                return true;
            },
        );

        $this->assertIsString($token);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NeuesPasswort123',
            'password_confirmation' => 'NeuesPasswort123',
        ])->assertOk()->assertJsonPath('message', 'Ihr Passwort wurde zurück gesetzt.');

        $user->refresh();
        $this->assertIsString($user->password);
        $this->assertTrue(Hash::check('NeuesPasswort123', $user->password));

        // The PasswordReset event triggers the password-changed mail.
        Notification::assertSentTo($user, PasswordChangedNotification::class);
    }

    public function test_password_cannot_be_reset_with_an_invalid_token(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/auth/reset-password', [
            'token' => 'ungueltiger-token',
            'email' => $user->email,
            'password' => 'NeuesPasswort123',
            'password_confirmation' => 'NeuesPasswort123',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Der Passwort-zurück-setzen-Token ist ungültig.');
    }

    public function test_weak_passwords_are_rejected(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/auth/reset-password', [
            'token' => 'irgendein-token',
            'email' => $user->email,
            'password' => 'kurz',
            'password_confirmation' => 'kurz',
        ])->assertUnprocessable()->assertJsonValidationErrors(['password']);
    }
}
