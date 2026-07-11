<?php

declare(strict_types=1);

namespace Tests\Feature\ChangeData;

use Illuminate\Support\Facades\Notification;

final class TerminationChangeRequestTest extends ChangeDataTestCase
{
    public function test_a_termination_is_stored_as_a_ticket(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        // Fixture: earliest_termination_date 2025-07-25.
        $this->mockContract();

        $response = $this->postChangeRequest($user, 'termination', [
            'termination_at' => '2025-08-01',
            'reason_of_termination' => 'Umzug ins Ausland',
        ]);

        $response->assertCreated()->assertJsonPath('data.form_type', 'termination');
        $this->assertInfoTextReturned($response);

        $this->assertChangeRequestStored('termination', $user, [
            'reason_of_termination' => 'Umzug ins Ausland',
            'termination_at' => '2025-08-01',
        ]);

        $this->assertCompanyWasNotified('Kündigung eingereicht');
    }

    public function test_a_termination_before_the_earliest_termination_date_is_rejected(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'termination', [
            'termination_at' => '2025-07-01',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.termination_at.0', 'Das Kündigungsdatum darf nicht vor dem 2025-07-25 liegen.');

        $this->assertDatabaseCount('customer_messages', 0);
    }

    public function test_the_termination_date_is_required(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'termination', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['termination_at']);
    }
}
