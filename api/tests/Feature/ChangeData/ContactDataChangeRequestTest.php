<?php

declare(strict_types=1);

namespace Tests\Feature\ChangeData;

use Illuminate\Support\Facades\Notification;

final class ContactDataChangeRequestTest extends ChangeDataTestCase
{
    public function test_contact_data_changes_are_stored_as_a_ticket(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        // The fixture contract has send_emails = 'no', so enabling it is a change.
        $this->mockContract();

        $response = $this->postChangeRequest($user, 'contact-data', [
            'phone' => '04921 123456',
            'mobile' => '0176 12345678',
            'send_emails' => '1',
        ]);

        $response->assertCreated()->assertJsonPath('data.form_type', 'contact-data');
        $this->assertInfoTextReturned($response);

        $this->assertChangeRequestStored('contact-data', $user, [
            'phone' => '04921 123456',
            'mail' => null,
            'mobile' => '0176 12345678',
            'send_emails' => '1',
            'change_all_contracts' => null,
        ]);

        $this->assertCompanyWasNotified('Kontaktdaten geändert');
    }

    public function test_an_unchanged_send_emails_value_is_stored_as_null(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        // Fixture: send_emails = 'no' → sending '0' again is NOT a change.
        $this->mockContract();

        $this->postChangeRequest($user, 'contact-data', [
            'phone' => '04921 123456',
            'send_emails' => '0',
        ])->assertCreated();

        $this->assertChangeRequestStored('contact-data', $user, [
            'phone' => '04921 123456',
            'mail' => null,
            'mobile' => null,
            'send_emails' => null,
            'change_all_contracts' => null,
        ]);
    }

    public function test_an_invalid_email_is_rejected(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'contact-data', ['mail' => 'not-an-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['mail']);

        $this->assertDatabaseCount('customer_messages', 0);
    }

    public function test_an_empty_form_is_rejected(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'contact-data', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.form.0', 'Ihre Nachricht wurde nicht gespeichert, es wurden keine Felder ausgefüllt.');

        $this->assertDatabaseCount('customer_messages', 0);
        Notification::assertNothingSent();
    }
}
