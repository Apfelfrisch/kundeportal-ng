<?php

declare(strict_types=1);

namespace Tests\Unit\Integrations\CustomerDataApi\Data;

use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Integrations\CustomerDataApi\Data\ContractFileData;
use App\Integrations\CustomerDataApi\Data\ContractPaymentData;
use App\Integrations\CustomerDataApi\Data\InvoiceData;
use App\Integrations\CustomerDataApi\Data\MeterCountData;
use App\Integrations\CustomerDataApi\Data\MeterData;
use App\Integrations\CustomerDataApi\Data\MeterPointData;
use App\Integrations\CustomerDataApi\Data\PaymentPlanData;
use App\Integrations\CustomerDataApi\Data\PriceComponentData;
use App\Integrations\CustomerDataApi\Exceptions\InvalidApiPayloadException;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;
use Tests\Fixtures\FixtureLoader;

final class ContractDataTest extends TestCase
{
    public function test_it_maps_the_canonical_contract_payload(): void
    {
        $contract = ContractData::fromArray($this->contractPayload());

        $this->assertSame(123456, $contract->contractNumber);
        $this->assertSame('10001', $contract->customerNumber);
        $this->assertNull($contract->salesPartnerId);
        $this->assertSame('Musterfirma GmbH', $contract->billingContactCompany);
        $this->assertSame('Herr', $contract->billingContactSalutation);
        $this->assertNull($contract->billingContactTitle);
        $this->assertSame('Max', $contract->billingContactFirstName);
        $this->assertSame('Mustermann', $contract->billingContactLastName);
        $this->assertSame('DE44500105175407324931', $contract->iban);
        $this->assertSame('Musterbank', $contract->bank);
        $this->assertSame('Max Mustermann', $contract->accountOwner);
        $this->assertSame('2024-06-15', $contract->receivedAt?->format('Y-m-d'));
        $this->assertSame('2024-07-01', $contract->deliveryStart?->format('Y-m-d'));
        $this->assertNull($contract->deliveryEnd);
        $this->assertSame('2025-10-01', $contract->priceGuarantee?->format('Y-m-d'));
        $this->assertSame('2026-07-01', $contract->contractTerm?->format('Y-m-d'));
        $this->assertSame('2025-07-25', $contract->earliestTerminationDate?->format('Y-m-d'));
        $this->assertSame('3', $contract->status);
        $this->assertSame('Klassik Strom', $contract->tariff);
        $this->assertSame('fixed', $contract->priceType);
        $this->assertSame(39.95, $contract->workingPrice);
        $this->assertSame(12.5, $contract->basePrice);
        $this->assertSame('2025-06-01', $contract->tariffEffectiveFrom?->format('Y-m-d'));
        $this->assertSame('0401234567', $contract->phone);
        $this->assertSame('01701234567', $contract->mobile);
        $this->assertSame('alt@example.org', $contract->mail);
        $this->assertSame('20095', $contract->zip);
        $this->assertSame('Hamburg', $contract->city);
        $this->assertSame('Musterweg', $contract->street);
        $this->assertSame('10', $contract->streetNumber);
        $this->assertSame('2. OG', $contract->addressAdditive);
    }

    public function test_sepa_is_the_inverted_self_payer_flag(): void
    {
        $this->assertTrue(ContractData::fromArray($this->contractPayload())->sepa);

        $data = $this->contractPayload();
        $data['self_payer'] = true;

        $this->assertFalse(ContractData::fromArray($data)->sepa);
    }

    public function test_send_emails_is_true_only_for_the_literal_yes(): void
    {
        $this->assertFalse(ContractData::fromArray($this->contractPayload())->sendEmails);

        $data = $this->contractPayload();
        $data['send_emails'] = 'yes';

        $this->assertTrue(ContractData::fromArray($data)->sendEmails);
    }

    public function test_it_maps_the_price_components_from_the_contract_tariff(): void
    {
        $contract = ContractData::fromArray($this->contractPayload());

        $this->assertNotNull($contract->basePriceComponents);
        $this->assertCount(3, $contract->basePriceComponents);
        $first = $contract->basePriceComponents[0];
        $this->assertInstanceOf(PriceComponentData::class, $first);
        $this->assertSame('supplierBasePrice', $first->name);
        $this->assertSame('base_price', $first->type);
        $this->assertSame(8.5, $first->amount);

        $this->assertNotNull($contract->workingPriceComponents);
        $this->assertCount(10, $contract->workingPriceComponents);
        $this->assertSame('supplierWorkingPrice', $contract->workingPriceComponents[0]->name);
        $this->assertSame(0.05, $contract->workingPriceComponents[0]->amount);
    }

    public function test_price_components_are_null_when_the_contract_tariff_is_missing(): void
    {
        $data = $this->contractPayload();
        unset($data['contract_tariff']);

        $contract = ContractData::fromArray($data);

        $this->assertNull($contract->basePriceComponents);
        $this->assertNull($contract->workingPriceComponents);
        $this->assertTrue($contract->basePriceComponentCollection()->isEmpty());
        $this->assertTrue($contract->workingPriceComponentCollection()->isEmpty());
    }

    public function test_it_maps_the_invoices(): void
    {
        $contract = ContractData::fromArray($this->contractPayload());

        $this->assertCount(1, $contract->invoices);
        $invoice = $contract->invoices[0];
        $this->assertInstanceOf(InvoiceData::class, $invoice);
        $this->assertSame(501, $invoice->id);
        $this->assertSame('RE-2025-0001', $invoice->invoiceNumber);
        $this->assertSame(123456, $invoice->contractNumber);
        $this->assertSame('2025-03-05', $invoice->invoiceDate?->format('Y-m-d'));
        $this->assertSame('2025-03-01', $invoice->invoiceFrom?->format('Y-m-d'));
        $this->assertSame(2500.0, $invoice->consumption);
        $this->assertSame('jahresrechnung-2024.pdf', $invoice->filename);
        $this->assertSame('invoices/123456/jahresrechnung-2024.pdf', $invoice->completeFilePath);
        $this->assertNull($invoice->canceledAt);
    }

    public function test_it_maps_the_meter_points_with_meters_and_meter_counts(): void
    {
        $contract = ContractData::fromArray($this->contractPayload());

        $this->assertCount(1, $contract->meterPoints);
        $meterPoint = $contract->meterPoints[0];
        $this->assertInstanceOf(MeterPointData::class, $meterPoint);
        $this->assertSame(1, $meterPoint->id);
        $this->assertSame(123456, $meterPoint->contractNumber);
        $this->assertSame('10001', $meterPoint->customerNumber);
        $this->assertSame('DE0012345678901234567890123456789', $meterPoint->maloId);
        $this->assertSame('20095', $meterPoint->zip);
        $this->assertSame('Hamburg', $meterPoint->city);
        $this->assertSame('Musterweg', $meterPoint->street);
        $this->assertSame('10', $meterPoint->streetNumber);
        $this->assertSame('2. OG', $meterPoint->addressAdditive);
        $this->assertSame(2500.0, $meterPoint->yearlyConsumption);
        $this->assertSame('2024-07-01', $meterPoint->deliveryFrom?->format('Y-m-d'));
        $this->assertNull($meterPoint->deliveryUntil);

        $this->assertCount(1, $meterPoint->meters);
        $meter = $meterPoint->meters[0];
        $this->assertInstanceOf(MeterData::class, $meter);
        $this->assertSame(42, $meter->id);
        $this->assertSame(1, $meter->meterPointId);
        $this->assertSame('1APBN0012345', $meter->meterNumber);
        $this->assertSame('ETZ', $meter->type);
        $this->assertFalse($meter->smartMeter);
        $this->assertSame('2024-07-01', $meter->createdAt?->format('Y-m-d'));

        $this->assertCount(1, $meterPoint->meterCounts);
        $meterCount = $meterPoint->meterCounts[0];
        $this->assertInstanceOf(MeterCountData::class, $meterCount);
        $this->assertSame(77, $meterCount->id);
        $this->assertSame(1, $meterCount->meterPointId);
        $this->assertSame(42, $meterCount->meterId);
        $this->assertSame('1APBN0012345', $meterCount->meterNumber);
        $this->assertSame('ETZ', $meterCount->type);
        $this->assertSame('220', $meterCount->readingKind);
        $this->assertSame('MVR', $meterCount->readingType);
        $this->assertSame('2025-06-30', $meterCount->readingDate?->format('Y-m-d'));
        $this->assertSame(5120.5, $meterCount->meterCount1);
        $this->assertNull($meterCount->meterCount2);
        $this->assertNull($meterCount->meterCount3);
        $this->assertSame(2500.0, $meterCount->yearlyUsage);
    }

    public function test_it_maps_the_payment_plans(): void
    {
        $contract = ContractData::fromArray($this->contractPayload());

        $this->assertCount(1, $contract->paymentPlans);
        $plan = $contract->paymentPlans[0];
        $this->assertInstanceOf(PaymentPlanData::class, $plan);
        $this->assertSame(1, $plan->id);
        $this->assertSame(123456, $plan->contractNumber);
        $this->assertSame('2025-06-01', $plan->validFrom?->format('Y-m-d'));
        $this->assertNull($plan->validUntil);
        $this->assertSame('2025-08-01', $plan->nextPayment?->format('Y-m-d'));
        $this->assertSame('monthly', $plan->type);
        $this->assertSame('monthly', $plan->expression);
        $this->assertSame(12000.0, $plan->amount);
    }

    public function test_it_maps_the_contract_payments(): void
    {
        $contract = ContractData::fromArray($this->contractPayload());

        $this->assertCount(1, $contract->contractPayments);
        $payment = $contract->contractPayments[0];
        $this->assertInstanceOf(ContractPaymentData::class, $payment);
        $this->assertSame(301, $payment->id);
        $this->assertSame(123456, $payment->contractNumber);
        $this->assertSame(120.0, $payment->outgoingPayment);
        $this->assertSame(120.0, $payment->incomingPayment);
        $this->assertSame('2025-06-01', $payment->bookingDate?->format('Y-m-d'));
        $this->assertSame('1210', $payment->counterAccount);
    }

    public function test_it_maps_the_contract_files(): void
    {
        $contract = ContractData::fromArray($this->contractPayload());

        $this->assertCount(1, $contract->contractFiles);
        $file = $contract->contractFiles[0];
        $this->assertInstanceOf(ContractFileData::class, $file);
        $this->assertSame(601, $file->id);
        $this->assertSame(123456, $file->contractNumber);
        $this->assertSame('Vertragsbestätigung', $file->body);
        $this->assertSame('contract-confirmation', $file->tag);
        $this->assertSame('contracts/123456/vertragsbestaetigung.pdf', $file->path);
        $this->assertSame('vertragsbestaetigung.pdf', $file->filename);
        $this->assertSame('2024-07-02 10:00:00', $file->createdAt?->format('Y-m-d H:i:s'));
    }

    public function test_contract_file_created_at_falls_back_to_null_when_missing(): void
    {
        $file = ContractFileData::fromArray([
            'id' => 1,
            'contract_id' => 123456,
            'body' => null,
            'tag' => null,
            'path' => 'a/b.pdf',
            'filename' => 'b.pdf',
        ]);

        $this->assertNull($file->createdAt);
    }

    public function test_optional_single_contract_fields_may_be_missing_entirely(): void
    {
        $data = $this->contractPayload();
        unset($data['sales_partner_id'], $data['received_at'], $data['earliest_termination_date'], $data['price_type']);

        $contract = ContractData::fromArray($data);

        $this->assertNull($contract->salesPartnerId);
        $this->assertNull($contract->receivedAt);
        $this->assertNull($contract->earliestTerminationDate);
        $this->assertNull($contract->priceType);
        $this->assertFalse($contract->isDynamic());
    }

    public function test_is_dynamic_only_for_the_dynamic_price_type(): void
    {
        $this->assertFalse(ContractData::fromArray($this->contractPayload())->isDynamic());

        $data = $this->contractPayload();
        $data['price_type'] = 'dynamic';

        $this->assertTrue(ContractData::fromArray($data)->isDynamic());
    }

    public function test_current_payment_plan_returns_the_first_plan_with_an_upcoming_payment(): void
    {
        $contract = ContractData::fromArray($this->contractPayload());

        $current = $contract->currentPaymentPlan(CarbonImmutable::parse('2025-07-11'));
        $this->assertNotNull($current);
        $this->assertSame(1, $current->id);

        $this->assertNull($contract->currentPaymentPlan(CarbonImmutable::parse('2025-08-02')));
    }

    public function test_latest_meter_point_prefers_the_most_recent_delivery_from(): void
    {
        $data = $this->contractPayload();
        $data['meter_points'] = [
            $this->meterPointPayload(id: 1, deliveryFrom: '2023-01-01'),
            $this->meterPointPayload(id: 2, deliveryFrom: '2024-07-01'),
            $this->meterPointPayload(id: 3, deliveryFrom: null),
        ];

        $latest = ContractData::fromArray($data)->latestMeterPoint();

        $this->assertSame(2, $latest?->id);
    }

    public function test_it_throws_a_named_exception_when_a_required_key_is_missing(): void
    {
        $data = $this->contractPayload();
        unset($data['iban']);

        $this->expectException(InvalidApiPayloadException::class);
        $this->expectExceptionMessage('Feld "iban" fehlt in der API-Antwort.');

        ContractData::fromArray($data);
    }

    public function test_it_throws_a_named_exception_when_a_required_value_has_the_wrong_type(): void
    {
        $data = $this->contractPayload();
        $data['id'] = 'not-a-number';

        $this->expectException(InvalidApiPayloadException::class);
        $this->expectExceptionMessage('Feld "id" hat einen ungültigen Wert');

        ContractData::fromArray($data);
    }

    /**
     * @return array<array-key, mixed>
     */
    private function contractPayload(): array
    {
        return FixtureLoader::data('customer-data-api/contract.json');
    }

    /**
     * @return array<string, mixed>
     */
    private function meterPointPayload(int $id, ?string $deliveryFrom): array
    {
        return [
            'id' => $id,
            'contract_id' => 123456,
            'customer_id' => '10001',
            'malo_id' => 'DE0012345678901234567890123456789',
            'zip' => '20095',
            'city' => 'Hamburg',
            'street' => 'Musterweg',
            'street_number' => '10',
            'street_addition' => null,
            'yearly_consumption' => 2500,
            'delivery_from' => $deliveryFrom,
            'delivery_until' => null,
            'meters' => [],
            'meter_counts' => [],
        ];
    }
}
