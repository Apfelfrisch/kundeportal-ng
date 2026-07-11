<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

final class SetPasswordTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:3000');
    }

    public function test_passwordless_users_can_set_an_initial_password(): void
    {
        Notification::fake();

        $user = User::factory()->withoutPassword()->create();

        $this->actingAs($user)
            ->postJson('/api/auth/set-password', [
                'password' => 'NeuesPasswort123',
                'password_confirmation' => 'NeuesPasswort123',
            ])
            ->assertOk()
            ->assertJsonPath('data.password_set', true);

        $user->refresh();
        $this->assertIsString($user->password);
        $this->assertTrue(Hash::check('NeuesPasswort123', $user->password));

        // Unverified users get a verification mail right after setting the password.
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_verified_users_do_not_get_another_verification_mail(): void
    {
        Notification::fake();

        $user = User::factory()->create(['password' => null]);

        $this->actingAs($user)
            ->postJson('/api/auth/set-password', [
                'password' => 'NeuesPasswort123',
                'password_confirmation' => 'NeuesPasswort123',
            ])
            ->assertOk();

        Notification::assertNothingSent();
    }

    public function test_users_with_a_password_cannot_use_this_endpoint(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/auth/set-password', [
                'password' => 'NeuesPasswort123',
                'password_confirmation' => 'NeuesPasswort123',
            ])
            ->assertStatus(409);

        $user->refresh();
        $this->assertIsString($user->password);
        $this->assertTrue(Hash::check('password', $user->password));
    }

    public function test_guests_cannot_set_a_password(): void
    {
        $this->postJson('/api/auth/set-password', [
            'password' => 'NeuesPasswort123',
            'password_confirmation' => 'NeuesPasswort123',
        ])->assertUnauthorized();
    }
}
