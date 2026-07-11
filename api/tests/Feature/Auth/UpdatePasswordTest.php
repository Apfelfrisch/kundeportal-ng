<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\PasswordChangedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

final class UpdatePasswordTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:3000');
    }

    public function test_password_can_be_updated_with_the_current_password(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/auth/password', [
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

    public function test_wrong_current_password_is_rejected(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/auth/password', [
                'current_password' => 'falsches-passwort',
                'password' => 'NeuesPasswort123',
                'password_confirmation' => 'NeuesPasswort123',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.current_password.0', 'Das Passwort ist falsch.');

        $user->refresh();
        $this->assertIsString($user->password);
        $this->assertTrue(Hash::check('password', $user->password));

        Notification::assertNothingSent();
    }

    public function test_guests_cannot_update_a_password(): void
    {
        $this->putJson('/api/auth/password', [
            'current_password' => 'password',
            'password' => 'NeuesPasswort123',
            'password_confirmation' => 'NeuesPasswort123',
        ])->assertUnauthorized();
    }
}
