<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class LogoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:3000');
    }

    public function test_authenticated_users_can_logout(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/auth/logout')
            ->assertNoContent();
    }

    public function test_guests_cannot_logout(): void
    {
        $this->postJson('/api/auth/logout')->assertUnauthorized();
    }
}
