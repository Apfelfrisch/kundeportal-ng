<?php

declare(strict_types=1);

namespace Tests\Feature\ChangeData;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Notification;

final class InstallmentChangeRequestTest extends ChangeDataTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Inside the fixture's payment plan window (next_payment 2025-08-01,
        // amount 12000 ct → 120 € → allowed range 96 € to 144 €).
        $this->travelTo(CarbonImmutable::parse('2025-07-15 12:00:00'));
    }

    public function test_an_installment_change_within_the_range_is_stored(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $response = $this->postChangeRequest($user, 'installment', [
            'installment' => 130,
            'effective_from' => '2025-08-01',
        ]);

        $response->assertCreated()->assertJsonPath('data.form_type', 'installment');
        $this->assertInfoTextReturned($response);

        $this->assertChangeRequestStored('installment', $user, [
            'installment' => 130,
            'effective_from' => '2025-08-01',
        ]);

        $this->assertCompanyWasNotified('Abschlag geändert');
    }

    public function test_an_installment_above_the_range_is_rejected(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'installment', [
            'installment' => 200,
            'effective_from' => '2025-08-01',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['installment']);

        $this->assertDatabaseCount('customer_messages', 0);
    }

    public function test_an_installment_below_the_range_is_rejected(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'installment', [
            'installment' => 50,
            'effective_from' => '2025-08-01',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['installment']);
    }

    public function test_the_effective_date_must_not_be_in_the_past(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'installment', [
            'installment' => 130,
            'effective_from' => '2025-07-14',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['effective_from']);
    }
}
