<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class SessionProbeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:3000');
    }

    public function test_authenticated_users_get_their_session_payload(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/auth/session')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.admin', false)
            ->assertJsonPath('data.email_verified', true)
            ->assertJsonPath('data.password_set', true);
    }

    public function test_passwordless_user_session_reports_missing_password(): void
    {
        $user = User::factory()->withoutPassword()->create();

        $this->actingAs($user)
            ->getJson('/api/auth/session')
            ->assertOk()
            ->assertJsonPath('data.email_verified', false)
            ->assertJsonPath('data.password_set', false);
    }

    public function test_guests_receive_401_with_message(): void
    {
        $this->getJson('/api/auth/session')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Nicht angemeldet.');
    }
}
