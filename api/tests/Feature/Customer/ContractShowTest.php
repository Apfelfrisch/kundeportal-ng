<?php

declare(strict_types=1);

namespace Tests\Feature\Customer;

use App\Integrations\CustomerDataApi\Requests\GetContractRequest;
use App\Models\User;
use Carbon\CarbonImmutable;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;

final class ContractShowTest extends CustomerTestCase
{
    public function test_a_confirmed_customer_gets_the_contract_with_computed_prices(): void
    {
        // Freeze inside the fixture's payment plan window (next_payment 2025-08-01).
        $this->travelTo(CarbonImmutable::parse('2025-07-15 12:00:00'));

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456")
            ->assertOk()
            ->assertJsonPath('data.contract_number', 123456)
            ->assertJsonPath('data.customer_number', '10001')
            ->assertJsonPath('data.status.id', 3)
            ->assertJsonPath('data.status.label', 'In Belieferung')
            ->assertJsonPath('data.is_dynamic', false)
            ->assertJsonPath('data.prices.calculated_dynamic_working_price_ct', null)
            ->assertJsonPath('data.bank.iban', 'DE44500105175407324931')
            ->assertJsonPath('data.bank.sepa', true)
            ->assertJsonPath('data.billing_contact.last_name', 'Mustermann')
            ->assertJsonPath('data.billing_address.zip', '20095')
            ->assertJsonPath('data.contact.send_emails', false)
            ->assertJsonPath('data.installment.amount_cents', 12000)
            ->assertJsonPath('data.installment.next_payment', '2025-08-01')
            ->assertJsonPath('data.meter_points.0.meters.0.meter_number', '1APBN0012345')
            ->assertJsonPath('data.meter_points.0.meter_counts.0.reading_kind.label', 'Netzmeldung')
            ->assertJsonPath('data.meter_points.0.meter_counts.0.reading_type.label', 'Monatliche Ablesung')
            ->assertJsonPath('data.invoices.0.invoice_number', 'RE-2025-0001')
            ->assertJsonPath('data.files.0.id', 601)
            ->assertJsonPath('data.files.0.filename', 'vertragsbestaetigung.pdf')
            ->assertJsonPath('data.payments.0.counter_account', '1210');

        // working_price 39.95 EUR → 3995 ct, gross ×1.19; base_price 12.50 EUR/month.
        $this->assertEqualsWithDelta(3995.0, $response->json('data.prices.working_price_ct'), 0.0001);
        $this->assertEqualsWithDelta(3995.0 * 1.19, $response->json('data.prices.working_price_ct_gross'), 0.0001);
        $this->assertEqualsWithDelta(12.5, $response->json('data.prices.base_price_eur'), 0.0001);
        $this->assertEqualsWithDelta(12.5 * 1.19, $response->json('data.prices.base_price_eur_gross'), 0.0001);

        // Base price components keep EUR amounts, zero amounts are NOT skipped.
        $this->assertSame(
            ['Grundpreis Versorger', 'Grundpreis Netzbetreiber', 'Messung und Ablesung'],
            array_keys((array) $response->json('data.prices.base_price_components')),
        );

        // Working price components in ct/kWh; the zero eegFee is skipped, the
        // purchase price is included for non-dynamic tariffs.
        $workingComponents = (array) $response->json('data.prices.working_price_components');
        $this->assertArrayHasKey('Beschaffungskosten', $workingComponents);
        $this->assertArrayNotHasKey('EEG-Umlage', $workingComponents);
        $this->assertEqualsWithDelta(8.0, $workingComponents['Beschaffungskosten'], 0.0001);
    }

    public function test_a_dynamic_contract_excludes_the_purchase_price(): void
    {
        config()->set('company.app.dynamic-electric-prices', true);

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse([
                'data' => $this->contractPayload(['price_type' => 'dynamic']),
            ]),
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456")
            ->assertOk()
            ->assertJsonPath('data.price_type', 'dynamic')
            ->assertJsonPath('data.is_dynamic', true);

        $workingComponents = (array) $response->json('data.prices.working_price_components');
        $this->assertArrayNotHasKey('Beschaffungskosten', $workingComponents);

        // Sum of all working price components except supplierPurchasePrice, ×100.
        $this->assertEqualsWithDelta(17.459, $response->json('data.prices.calculated_dynamic_working_price_ct'), 0.0001);
    }

    public function test_a_dynamic_price_type_without_the_tenant_flag_stays_static(): void
    {
        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse([
                'data' => $this->contractPayload(['price_type' => 'dynamic']),
            ]),
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456")
            ->assertOk()
            ->assertJsonPath('data.is_dynamic', false)
            ->assertJsonPath('data.prices.calculated_dynamic_working_price_ct', null);

        $this->assertArrayHasKey(
            'Beschaffungskosten',
            (array) $response->json('data.prices.working_price_components'),
        );
    }

    public function test_an_unconfirmed_assignment_is_rejected(): void
    {
        $user = $this->customerWithContract(confirmed: false);

        MockClient::global([]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456")
            ->assertForbidden()
            ->assertJsonPath('message', 'Sie haben keinen Zugriff auf diesen Vertrag.');
    }

    public function test_a_foreign_contract_is_rejected(): void
    {
        $user = $this->customerWithContract(contractNumber: 123456);

        MockClient::global([]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/999999")
            ->assertForbidden()
            ->assertJsonPath('message', 'Sie haben keinen Zugriff auf diesen Vertrag.');
    }

    public function test_an_administrator_bypasses_the_assignment_check(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $this->actingAs($admin)
            ->getJson("/api/customers/{$customer->id}/contracts/123456")
            ->assertOk()
            ->assertJsonPath('data.contract_number', 123456);
    }

    public function test_a_kvs_404_becomes_a_404_with_the_german_message(): void
    {
        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse([], 404),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456")
            ->assertNotFound()
            ->assertJsonPath('message', 'Vertrag 123456 wurde im System nicht gefunden. Fehlercode 404.');
    }
}
