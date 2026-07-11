<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\ContractToUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

final class ContractConfirmationTest extends TestCase
{
    use RefreshDatabase;

    public function test_pending_assignment_is_described(): void
    {
        $assignment = ContractToUser::factory()->unconfirmed()->create();
        $user = User::query()->findOrFail($assignment->user_id);

        $this->getJson($this->signedUrl($assignment->contract_number))
            ->assertOk()
            ->assertJsonPath('data.contract_number', $assignment->contract_number)
            ->assertJsonPath('data.user_name', $user->name)
            ->assertJsonPath('data.confirmed', false);
    }

    public function test_already_confirmed_assignment_is_reported_without_user_name(): void
    {
        $assignment = ContractToUser::factory()->create();

        $this->getJson($this->signedUrl($assignment->contract_number))
            ->assertOk()
            ->assertJsonPath('data.contract_number', $assignment->contract_number)
            ->assertJsonPath('data.confirmed', true)
            ->assertJsonMissingPath('data.user_name');
    }

    public function test_unknown_contract_number_returns_a_german_404(): void
    {
        $this->getJson($this->signedUrl(999999))
            ->assertNotFound()
            ->assertJsonPath('message', 'Zu diesem Vertrag liegt keine Zuweisung vor.');
    }

    public function test_tampered_signature_is_rejected(): void
    {
        $assignment = ContractToUser::factory()->unconfirmed()->create();

        $url = str_replace('signature=', 'signature=00', $this->signedUrl($assignment->contract_number));

        $this->getJson($url)->assertForbidden();
    }

    public function test_unsigned_requests_are_rejected(): void
    {
        $assignment = ContractToUser::factory()->unconfirmed()->create();

        $this->getJson("/api/auth/contract-confirmation/{$assignment->contract_number}")
            ->assertForbidden();

        $this->postJson("/api/auth/contract-confirmation/{$assignment->contract_number}")
            ->assertForbidden();
    }

    public function test_assignment_can_be_confirmed(): void
    {
        $assignment = ContractToUser::factory()->unconfirmed()->create();

        $this->postJson($this->signedUrl($assignment->contract_number))
            ->assertOk()
            ->assertJsonPath('data.confirmed', true);

        $fresh = ContractToUser::withUnconfirmed()->findOrFail($assignment->id);
        $this->assertTrue($fresh->confirmed);
    }

    public function test_confirming_twice_is_idempotent(): void
    {
        $assignment = ContractToUser::factory()->create();

        $this->postJson($this->signedUrl($assignment->contract_number))
            ->assertOk()
            ->assertJsonPath('data.confirmed', true);
    }

    public function test_confirmation_cannot_be_submitted_with_a_tampered_signature(): void
    {
        $assignment = ContractToUser::factory()->unconfirmed()->create();

        $url = str_replace('signature=', 'signature=00', $this->signedUrl($assignment->contract_number));

        $this->postJson($url)->assertForbidden();

        $fresh = ContractToUser::withUnconfirmed()->findOrFail($assignment->id);
        $this->assertFalse($fresh->confirmed);
    }

    private function signedUrl(int $contractNumber): string
    {
        return URL::signedRoute('contract.confirm', ['contract_number' => $contractNumber]);
    }
}
