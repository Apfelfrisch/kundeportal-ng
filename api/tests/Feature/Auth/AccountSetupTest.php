<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

final class AccountSetupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:3000');
    }

    public function test_setup_page_data_is_returned_for_a_valid_signed_link(): void
    {
        $user = User::factory()->withoutPassword()->create();

        $this->getJson($this->signedUrl($user))
            ->assertOk()
            ->assertJsonPath('data.name', $user->name)
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_tampered_signature_is_rejected(): void
    {
        $user = User::factory()->withoutPassword()->create();

        $url = str_replace('signature=', 'signature=00', $this->signedUrl($user));

        $this->getJson($url)->assertForbidden();
    }

    public function test_expired_link_is_rejected(): void
    {
        $user = User::factory()->withoutPassword()->create();

        $url = $this->signedUrl($user, now()->subMinute());

        $this->getJson($url)->assertForbidden();
    }

    public function test_link_for_a_foreign_email_hash_is_rejected(): void
    {
        $user = User::factory()->withoutPassword()->create();

        // Valid signature, but the hash does not belong to the user's email.
        $url = URL::temporarySignedRoute('account.setup', now()->addDays(7), [
            'user' => $user->id,
            'hash' => sha1('andere-adresse@example.com'),
        ]);

        $this->getJson($url)->assertForbidden();
    }

    public function test_already_set_up_accounts_get_a_410(): void
    {
        $user = User::factory()->create();

        $this->getJson($this->signedUrl($user))
            ->assertStatus(410)
            ->assertJsonPath('message', 'Ihr Account ist bereits eingerichtet. Bitte melden Sie sich an.');
    }

    public function test_account_can_be_set_up_and_user_is_logged_in(): void
    {
        $user = User::factory()->withoutPassword()->create();

        $response = $this->postJson($this->signedUrl($user), [
            'password' => 'NeuesPasswort123',
            'password_confirmation' => 'NeuesPasswort123',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email_verified', true)
            ->assertJsonPath('data.password_set', true);

        $user->refresh();
        $this->assertIsString($user->password);
        $this->assertTrue(Hash::check('NeuesPasswort123', $user->password));
        $this->assertNotNull($user->email_verified_at);

        $this->assertAuthenticatedAs($user);
    }

    public function test_setup_rejects_weak_or_unconfirmed_passwords(): void
    {
        $user = User::factory()->withoutPassword()->create();

        $this->postJson($this->signedUrl($user), [
            'password' => 'kurz',
            'password_confirmation' => 'kurz',
        ])->assertUnprocessable()->assertJsonValidationErrors(['password']);

        $this->postJson($this->signedUrl($user), [
            'password' => 'NeuesPasswort123',
            'password_confirmation' => 'AnderesPasswort123',
        ])->assertUnprocessable()->assertJsonValidationErrors(['password']);
    }

    public function test_setup_cannot_be_submitted_with_a_tampered_signature(): void
    {
        $user = User::factory()->withoutPassword()->create();

        $url = str_replace('signature=', 'signature=00', $this->signedUrl($user));

        $this->postJson($url, [
            'password' => 'NeuesPasswort123',
            'password_confirmation' => 'NeuesPasswort123',
        ])->assertForbidden();

        $this->assertNull($user->refresh()->password);
    }

    private function signedUrl(User $user, ?CarbonImmutable $expiration = null): string
    {
        return URL::temporarySignedRoute('account.setup', $expiration ?? now()->addDays(7), [
            'user' => $user->id,
            'hash' => sha1($user->email),
        ]);
    }
}
