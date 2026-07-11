<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Models\User;
use App\Models\UserMailLog;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\PendingCommand;
use Tests\TestCase;

final class AuthCommandsTest extends TestCase
{
    use RefreshDatabase;

    public function test_make_admin_creates_a_verified_passwordless_admin(): void
    {
        $this->runArtisan('app:make-admin', ['name' => 'Admina', 'email' => 'admin@example.com'])
            ->assertSuccessful();

        $user = User::query()->where('email', 'admin@example.com')->sole();

        $this->assertTrue($user->isAdministrator());
        $this->assertNotNull($user->email_verified_at);
        $this->assertFalse($user->hasPassword());
    }

    public function test_make_admin_asks_for_missing_arguments(): void
    {
        $this->runArtisan('app:make-admin')
            ->expectsQuestion('Dein Name:', 'Admina')
            ->expectsQuestion('Deine E-Mail-Adresse:', 'admin@example.com')
            ->assertSuccessful();

        $this->assertTrue(User::query()->where('email', 'admin@example.com')->exists());
    }

    public function test_make_admin_can_set_a_password_interactively(): void
    {
        $this->runArtisan('app:make-admin', [
            'name' => 'Admina',
            'email' => 'admin@example.com',
            '--password' => true,
        ])
            ->expectsQuestion('Passwort:', 'GeheimesPasswort123')
            ->assertSuccessful();

        $user = User::query()->where('email', 'admin@example.com')->sole();

        $this->assertIsString($user->password);
        $this->assertTrue(Hash::check('GeheimesPasswort123', $user->password));
    }

    public function test_make_admin_rejects_duplicate_emails(): void
    {
        User::factory()->create(['email' => 'admin@example.com']);

        $this->runArtisan('app:make-admin', ['name' => 'Admina', 'email' => 'admin@example.com'])
            ->assertFailed();
    }

    public function test_reset_password_sends_the_reset_notification(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->runArtisan('app:reset-password', ['email' => $user->email])
            ->assertSuccessful();

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_reset_password_fails_for_unknown_users(): void
    {
        Notification::fake();

        $this->runArtisan('app:reset-password', ['email' => 'unbekannt@example.com'])
            ->assertFailed();

        Notification::assertNothingSent();
    }

    public function test_test_mails_sends_every_notification_once(): void
    {
        $this->runArtisan('app:test-mails', ['email' => 'mailtest@example.com'])
            ->assertSuccessful();

        $types = UserMailLog::query()->pluck('type')->all();

        $this->assertCount(6, $types);
        $this->assertEqualsCanonicalizing([
            'account_setup',
            'email_verification',
            'password_reset',
            'password_changed',
            'email_changed',
            'contract_assigned',
        ], $types);
    }

    /**
     * Like artisan(), but with a guaranteed PendingCommand return type.
     *
     * @param  array<string, mixed>  $parameters
     */
    private function runArtisan(string $command, array $parameters = []): PendingCommand
    {
        $pending = $this->artisan($command, $parameters);

        if (! $pending instanceof PendingCommand) {
            self::fail('Expected a PendingCommand instance.');
        }

        return $pending;
    }
}
