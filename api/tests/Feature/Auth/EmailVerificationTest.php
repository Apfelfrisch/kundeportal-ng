<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

final class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:3000');
    }

    public function test_email_can_be_verified_via_signed_link(): void
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)
            ->getJson($this->verificationUrl($user))
            ->assertOk()
            ->assertJsonPath('message', 'E-Mail-Adresse erfolgreich bestätigt.');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_tampered_signature_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();

        $url = str_replace('signature=', 'signature=00', $this->verificationUrl($user));

        $this->actingAs($user)->getJson($url)->assertForbidden();

        $this->assertNull($user->refresh()->email_verified_at);
    }

    public function test_wrong_email_hash_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $user->id,
            'hash' => sha1('andere-adresse@example.com'),
        ]);

        $this->actingAs($user)->getJson($url)->assertForbidden();
    }

    public function test_users_cannot_verify_with_a_link_of_another_user(): void
    {
        $user = User::factory()->unverified()->create();
        $other = User::factory()->unverified()->create();

        $this->actingAs($other)
            ->getJson($this->verificationUrl($user))
            ->assertForbidden();

        $this->assertNull($user->refresh()->email_verified_at);
    }

    public function test_guests_cannot_verify(): void
    {
        $user = User::factory()->unverified()->create();

        $this->getJson($this->verificationUrl($user))->assertUnauthorized();
    }

    public function test_verification_mail_can_be_resent(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();

        $this->actingAs($user)
            ->postJson('/api/auth/email/verification-notification')
            ->assertOk()
            ->assertJsonPath('message', 'E-Mail wurde gesendet.');

        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_verified_users_get_no_additional_mail(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/auth/email/verification-notification')
            ->assertOk()
            ->assertJsonPath('message', 'Ihre E-Mail-Adresse ist bereits bestätigt.');

        Notification::assertNothingSent();
    }

    private function verificationUrl(User $user): string
    {
        return URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $user->id,
            'hash' => sha1($user->email),
        ]);
    }
}
