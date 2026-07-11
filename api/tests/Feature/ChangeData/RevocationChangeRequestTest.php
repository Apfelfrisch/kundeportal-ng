<?php

declare(strict_types=1);

namespace Tests\Feature\ChangeData;

use Illuminate\Support\Facades\Notification;

final class RevocationChangeRequestTest extends ChangeDataTestCase
{
    public function test_a_revocation_is_stored_as_a_ticket(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $response = $this->postChangeRequest($user, 'revocation', [
            'reason_of_revocation' => 'Ich widerrufe meinen Vertrag.',
        ]);

        $response->assertCreated()->assertJsonPath('data.form_type', 'revocation');
        $this->assertInfoTextReturned($response);

        $this->assertChangeRequestStored('revocation', $user, [
            'reason_of_revocation' => 'Ich widerrufe meinen Vertrag.',
        ]);

        $this->assertCompanyWasNotified('Widerruf eingereicht');
    }

    public function test_an_empty_form_is_rejected(): void
    {
        Notification::fake();

        $user = $this->customerWithContract();
        $this->mockContract();

        $this->postChangeRequest($user, 'revocation', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.form.0', 'Ihre Nachricht wurde nicht gespeichert, es wurden keine Felder ausgefüllt.');

        $this->assertDatabaseCount('customer_messages', 0);
        Notification::assertNothingSent();
    }
}
