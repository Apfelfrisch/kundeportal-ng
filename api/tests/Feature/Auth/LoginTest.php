<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class LoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Mark the request as coming from the stateful SPA frontend.
        $this->withHeader('Referer', 'http://localhost:3000');
    }

    public function test_users_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.admin', false)
            ->assertJsonPath('data.email_verified', true)
            ->assertJsonPath('data.password_set', true);

        $this->assertAuthenticatedAs($user);
    }

    public function test_admin_flag_is_included_in_the_login_response(): void
    {
        $admin = User::factory()->admin()->create();

        $this->postJson('/api/auth/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk()->assertJsonPath('data.admin', true);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'falsches-passwort',
        ]);

        $response->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Ihre Eingaben stimmen nicht mit unseren gespeicherten Daten überein.');

        $this->assertGuest();
    }

    public function test_login_is_rate_limited_after_five_failed_attempts(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'falsches-passwort',
            ])->assertUnprocessable();
        }

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertUnprocessable();

        $message = $response->json('errors.email.0');
        $this->assertIsString($message);
        $this->assertStringStartsWith('Zu viele Anmeldungsversuche.', $message);

        $this->assertGuest();
    }

    public function test_login_requires_email_and_password(): void
    {
        $this->postJson('/api/auth/login', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    }
}
