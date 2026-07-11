<?php

declare(strict_types=1);

namespace Tests\Feature\ChangeData;

use Illuminate\Support\Facades\Notification;

final class DeliveryAddressChangeRequestTest extends ChangeDataTestCase
{
    public function test_delivery_address_changes_are_stored_with_all_flex_attributes(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $response = $this->postChangeRequest($user, 'delivery-address', [
            'street' => 'Deichstraße',
            'street_number' => '7',
            'address_additive' => 'Hinterhaus',
            'zip' => '26725',
            'city' => 'Emden',
            'date' => '2025-09-01',
            'meter_number' => '1APBN0012345',
            'malo' => 'DE0012345678901234567890123456789',
        ]);

        $response->assertCreated()->assertJsonPath('data.form_type', 'delivery-address');
        $this->assertInfoTextReturned($response);

        $this->assertChangeRequestStored('delivery-address', $user, [
            'street' => 'Deichstraße',
            'street_number' => '7',
            'address_additive' => 'Hinterhaus',
            'zip' => '26725',
            'city' => 'Emden',
            'date' => '2025-09-01',
            'meter_number' => '1APBN0012345',
            'malo' => 'DE0012345678901234567890123456789',
        ]);

        $this->assertCompanyWasNotified('Lieferadresse geändert');
    }

    public function test_the_address_fields_are_required(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'delivery-address', ['zip' => '26725'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['city', 'street', 'street_number']);

        $this->assertDatabaseCount('customer_messages', 0);
    }
}
