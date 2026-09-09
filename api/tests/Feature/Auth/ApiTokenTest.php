<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Bearer-token login of the mobile app. Unlike the SPA tests no Referer is
 * set: the app is not a stateful frontend.
 */
final class ApiTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_credentials_issue_a_token_with_the_user_payload(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/auth/token', [
            'email' => $user->email,
            'password' => 'password',
            'device_name' => 'iPhone von Anna',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email_verified', true)
            ->assertJsonPath('data.password_set', true);

        $token = $response->json('token');
        $this->assertIsString($token);
        $this->assertNotSame('', $token);

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'iPhone von Anna',
        ]);
    }

    public function test_the_token_authenticates_customer_routes(): void
    {
        $user = User::factory()->create();

        $token = $this->postJson('/api/auth/token', [
            'email' => $user->email,
            'password' => 'password',
            'device_name' => 'test',
        ])->json('token');

        $this->assertIsString($token);

        $this->withToken($token)
            ->getJson('/api/auth/session')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }

    public function test_wrong_password_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/auth/token', [
            'email' => $user->email,
            'password' => 'falsches-passwort',
            'device_name' => 'test',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_device_name_is_required(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/auth/token', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['device_name']);
    }

    public function test_deleting_the_token_revokes_it(): void
    {
        $user = User::factory()->create();

        $token = $this->postJson('/api/auth/token', [
            'email' => $user->email,
            'password' => 'password',
            'device_name' => 'test',
        ])->json('token');

        $this->assertIsString($token);

        $this->withToken($token)
            ->deleteJson('/api/auth/token')
            ->assertNoContent();

        $this->assertDatabaseCount('personal_access_tokens', 0);

        // The guard caches the resolved user within one test process.
        $this->app->make('auth')->forgetGuards();

        $this->flushHeaders()
            ->withToken($token)
            ->getJson('/api/auth/session')
            ->assertUnauthorized();
    }

    public function test_a_cookie_session_cannot_revoke_a_token(): void
    {
        $user = User::factory()->create();

        $this->withHeader('Referer', 'http://localhost:3000')
            ->actingAs($user)
            ->deleteJson('/api/auth/token')
            ->assertBadRequest();
    }

    public function test_the_token_is_not_accepted_without_a_bearer_header(): void
    {
        $this->getJson('/api/auth/session')->assertUnauthorized();
    }
}
