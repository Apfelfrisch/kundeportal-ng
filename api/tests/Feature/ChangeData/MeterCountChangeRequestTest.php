<?php

declare(strict_types=1);

namespace Tests\Feature\ChangeData;

use Illuminate\Support\Facades\Notification;

final class MeterCountChangeRequestTest extends ChangeDataTestCase
{
    public function test_a_single_meter_count_is_stored(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $response = $this->postChangeRequest($user, 'meter-count', [
            'meter_count' => 12345,
            'read_on' => '2025-07-01',
        ]);

        $response->assertCreated()->assertJsonPath('data.form_type', 'meter-count');
        $this->assertInfoTextReturned($response);

        $this->assertChangeRequestStored('meter-count', $user, [
            'meter_count' => 12345,
            'meter_count_ht' => null,
            'meter_count_nt' => null,
            'read_on' => '2025-07-01',
        ]);

        $this->assertCompanyWasNotified('Zählerstand eingereicht');
    }

    public function test_ht_and_nt_counts_can_replace_the_single_count(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'meter-count', [
            'meter_count_ht' => 8000,
            'meter_count_nt' => 4000,
            'read_on' => '2025-07-01',
        ])->assertCreated();

        $this->assertChangeRequestStored('meter-count', $user, [
            'meter_count' => null,
            'meter_count_ht' => 8000,
            'meter_count_nt' => 4000,
            'read_on' => '2025-07-01',
        ]);
    }

    public function test_an_empty_form_is_rejected(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'meter-count', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['meter_count', 'meter_count_ht', 'meter_count_nt', 'read_on']);

        $this->assertDatabaseCount('customer_messages', 0);
    }
}
