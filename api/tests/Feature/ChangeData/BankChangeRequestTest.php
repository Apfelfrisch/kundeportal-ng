<?php

declare(strict_types=1);

namespace Tests\Feature\ChangeData;

use Illuminate\Support\Facades\Notification;

final class BankChangeRequestTest extends ChangeDataTestCase
{
    public function test_bank_changes_are_stored_as_a_ticket_and_the_company_is_notified(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $response = $this->postChangeRequest($user, 'bank', [
            'iban' => 'DE02120300000000202051',
            'bank' => 'Neue Bank AG',
            'bank_account_owner' => 'Erika Mustermann',
            'sepa' => '1',
            'change_all_contracts' => '1',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.form_type', 'bank')
            ->assertJsonPath('data.status', 'UN_PROCESSED');

        $this->assertInfoTextReturned($response);

        $this->assertChangeRequestStored('bank', $user, [
            'bank' => 'Neue Bank AG',
            'bank_account_owner' => 'Erika Mustermann',
            'iban' => 'DE02120300000000202051',
            'sepa' => '1',
            'change_all_contracts' => '1',
        ]);

        $this->assertCompanyWasNotified('Bankverbindung geändert');
    }

    public function test_an_invalid_iban_is_rejected(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'bank', [
            'iban' => 'DE00123456780000000000',
            'bank' => 'Neue Bank AG',
            'bank_account_owner' => 'Erika Mustermann',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.iban.0', 'Die angegeben IBAN ist nicht korrekt.');

        $this->assertDatabaseCount('customer_messages', 0);
        Notification::assertNothingSent();
    }

    public function test_a_filled_bot_check_honeypot_is_rejected(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'bank', [
            'iban' => 'DE02120300000000202051',
            'bank' => 'Neue Bank AG',
            'bank_account_owner' => 'Erika Mustermann',
            'bot-check' => 'i am a robot',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['bot-check']);

        $this->assertDatabaseCount('customer_messages', 0);
        Notification::assertNothingSent();
    }
}
