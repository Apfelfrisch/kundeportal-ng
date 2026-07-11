<?php

declare(strict_types=1);

namespace Tests\Feature\ChangeData;

use Illuminate\Support\Facades\Notification;

final class BillingAddressChangeRequestTest extends ChangeDataTestCase
{
    public function test_billing_address_changes_are_stored_as_a_ticket(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $response = $this->postChangeRequest($user, 'billing-address', [
            'zip' => '26721',
            'city' => 'Emden',
            'street' => 'Neuer Weg',
            'street_number' => '12a',
            'address_additive' => '2. OG',
            'change_all_contracts' => '1',
        ]);

        $response->assertCreated()->assertJsonPath('data.form_type', 'billing-address');
        $this->assertInfoTextReturned($response);

        $this->assertChangeRequestStored('billing-address', $user, [
            'zip' => '26721',
            'city' => 'Emden',
            'street' => 'Neuer Weg',
            'street_number' => '12a',
            'address_additive' => '2. OG',
            'change_all_contracts' => '1',
        ]);

        $this->assertCompanyWasNotified('Rechnungsadresse geändert');
    }

    public function test_the_zip_must_have_exactly_five_characters(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'billing-address', [
            'zip' => '123',
            'city' => 'Emden',
            'street' => 'Neuer Weg',
            'street_number' => '12a',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.zip.0', 'Bitte genau 5 Zahlen für die Postleitzahl eingeben. Wenn vorhanden auch mit einer 0 am Anfang.');

        $this->assertDatabaseCount('customer_messages', 0);
    }

    public function test_an_empty_form_is_rejected(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'billing-address', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['zip', 'city', 'street', 'street_number']);

        $this->assertDatabaseCount('customer_messages', 0);
    }
}
