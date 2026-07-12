<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Domain\Pricing\PriceComponentCollection;
use App\Integrations\Support\Payload;
use App\Support\TenantConfig;
use Carbon\CarbonImmutable;

/**
 * Aggregate contract DTO. Field mapping ported 1:1 from the old
 * ContractRepository / ContractsRepository:
 *
 *  - `data.id`            → contractNumber
 *  - `data.customer_id`   → customerNumber
 *  - `data.self_payer`    → sepa (inverted!)
 *  - `data.send_emails`   → sendEmails (`'yes'` → true)
 *  - `data.street_addition` → addressAdditive
 *  - `data.phone_number` / `mobile_number` / `mail_address` → phone / mobile / mail
 *  - `data.contract_tariff.price.{base,working}_price_components` (each `?? null`)
 *
 * `received_at`, `earliest_termination_date` and `price_type` were only mapped
 * by the single-contract repository (not by the list repository), so payloads
 * from the list endpoints may lack them — they use `?? null` semantics here.
 */
final readonly class ContractData
{
    /**
     * @param  list<PriceComponentData>|null  $basePriceComponents
     * @param  list<PriceComponentData>|null  $workingPriceComponents
     * @param  list<InvoiceData>  $invoices
     * @param  list<MeterPointData>  $meterPoints
     * @param  list<PaymentPlanData>  $paymentPlans
     * @param  list<ContractPaymentData>  $contractPayments
     * @param  list<ContractFileData>  $contractFiles
     */
    public function __construct(
        public int $contractNumber,
        public string $customerNumber,
        public ?string $salesPartnerId,
        public ?string $billingContactCompany,
        public ?string $billingContactSalutation,
        public ?string $billingContactTitle,
        public ?string $billingContactFirstName,
        public ?string $billingContactLastName,
        public ?string $iban,
        public ?string $bank,
        public ?string $accountOwner,
        public bool $sepa,
        public ?CarbonImmutable $receivedAt,
        public ?CarbonImmutable $deliveryStart,
        public ?CarbonImmutable $deliveryEnd,
        public ?CarbonImmutable $priceGuarantee,
        public ?CarbonImmutable $contractTerm,
        public ?CarbonImmutable $earliestTerminationDate,
        public string $status,
        public ?string $tariff,
        public ?string $priceType,
        public ?float $workingPrice,
        public ?float $basePrice,
        public ?CarbonImmutable $tariffEffectiveFrom,
        public ?array $basePriceComponents,
        public ?array $workingPriceComponents,
        public ?string $phone,
        public ?string $mobile,
        public ?string $mail,
        public bool $sendEmails,
        public ?string $zip,
        public ?string $city,
        public ?string $street,
        public ?string $streetNumber,
        public ?string $addressAdditive,
        public array $invoices,
        public array $meterPoints,
        public array $paymentPlans,
        public array $contractPayments,
        public array $contractFiles,
    ) {}

    /**
     * @param  array<array-key, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return self::fromPayload(Payload::of($data));
    }

    public static function fromPayload(Payload $payload): self
    {
        $price = $payload->optionalPayload('contract_tariff')?->optionalPayload('price');

        return new self(
            contractNumber: $payload->int('id'),
            customerNumber: $payload->string('customer_id'),
            salesPartnerId: $payload->optionalString('sales_partner_id'),
            billingContactCompany: $payload->nullableString('billing_contact_company'),
            billingContactSalutation: $payload->nullableString('billing_contact_salutation'),
            billingContactTitle: $payload->nullableString('billing_contact_title'),
            billingContactFirstName: $payload->nullableString('billing_contact_first_name'),
            billingContactLastName: $payload->nullableString('billing_contact_last_name'),
            iban: $payload->nullableString('iban'),
            bank: $payload->nullableString('bank'),
            accountOwner: $payload->nullableString('account_owner'),
            sepa: ! $payload->looseBool('self_payer'),
            receivedAt: $payload->optionalDate('received_at'),
            deliveryStart: $payload->nullableDate('delivery_start'),
            deliveryEnd: $payload->nullableDate('delivery_end'),
            priceGuarantee: $payload->nullableDate('price_guarantee'),
            contractTerm: $payload->nullableDate('contract_term'),
            earliestTerminationDate: $payload->optionalDate('earliest_termination_date'),
            status: $payload->string('status'),
            tariff: $payload->nullableString('tariff'),
            priceType: $payload->optionalString('price_type'),
            workingPrice: $payload->nullableFloat('working_price'),
            basePrice: $payload->nullableFloat('base_price'),
            tariffEffectiveFrom: $payload->nullableDate('tariff_effective_from'),
            basePriceComponents: self::priceComponents($price, 'base_price_components'),
            workingPriceComponents: self::priceComponents($price, 'working_price_components'),
            phone: $payload->nullableString('phone_number'),
            mobile: $payload->nullableString('mobile_number'),
            mail: $payload->nullableString('mail_address'),
            sendEmails: $payload->nullableString('send_emails') === 'yes',
            zip: $payload->nullableString('zip'),
            city: $payload->nullableString('city'),
            street: $payload->nullableString('street'),
            streetNumber: $payload->nullableString('street_number'),
            addressAdditive: $payload->nullableString('street_addition'),
            invoices: array_map(
                static fn (Payload $invoice): InvoiceData => InvoiceData::fromPayload($invoice),
                $payload->payloadList('invoices'),
            ),
            meterPoints: array_map(
                static fn (Payload $meterPoint): MeterPointData => MeterPointData::fromPayload($meterPoint),
                $payload->payloadList('meter_points'),
            ),
            paymentPlans: array_map(
                static fn (Payload $paymentPlan): PaymentPlanData => PaymentPlanData::fromPayload($paymentPlan),
                $payload->payloadList('payment_plans'),
            ),
            contractPayments: array_map(
                static fn (Payload $contractPayment): ContractPaymentData => ContractPaymentData::fromPayload($contractPayment),
                $payload->payloadList('contract_payments'),
            ),
            contractFiles: array_map(
                static fn (Payload $contractFile): ContractFileData => ContractFileData::fromPayload($contractFile),
                $payload->payloadList('contract_files'),
            ),
        );
    }

    /**
     * Old Contract::isDynamic() minus the tenant feature flag — the flag check
     * (`config('company.app.dynamic-electric-prices')`) belongs to the service
     * layer, the DTO only reflects the KVS price type.
     */
    public function isDynamic(): bool
    {
        return $this->priceType === 'dynamic';
    }

    /**
     * Old Contract::isDynamic(): the KVS price type AND the tenant's
     * dynamic-electric-prices feature flag.
     */
    public function isDynamicFor(TenantConfig $tenant): bool
    {
        return $this->isDynamic() && $tenant->dynamicElectricPrices;
    }

    /**
     * Old Contract::paymentPlan(): the first plan whose next_payment is not in the past.
     */
    public function currentPaymentPlan(CarbonImmutable $now): ?PaymentPlanData
    {
        foreach ($this->paymentPlans as $paymentPlan) {
            if ($paymentPlan->nextPayment !== null && $paymentPlan->nextPayment->greaterThanOrEqualTo($now)) {
                return $paymentPlan;
            }
        }

        return null;
    }

    /**
     * Old Contract::meterPoint(): the meter point with the latest delivery_from.
     */
    public function latestMeterPoint(): ?MeterPointData
    {
        $meterPoints = $this->meterPoints;

        usort(
            $meterPoints,
            static fn (MeterPointData $a, MeterPointData $b): int => ($b->deliveryFrom?->getTimestamp() ?? PHP_INT_MIN) <=> ($a->deliveryFrom?->getTimestamp() ?? PHP_INT_MIN),
        );

        return $meterPoints[0] ?? null;
    }

    public function basePriceComponentCollection(): PriceComponentCollection
    {
        return new PriceComponentCollection($this->basePriceComponents ?? []);
    }

    public function workingPriceComponentCollection(): PriceComponentCollection
    {
        return new PriceComponentCollection($this->workingPriceComponents ?? []);
    }

    /**
     * @return list<PriceComponentData>|null
     */
    private static function priceComponents(?Payload $price, string $key): ?array
    {
        $components = $price?->optionalPayloadList($key);

        if ($components === null) {
            return null;
        }

        return array_map(
            static fn (Payload $component): PriceComponentData => PriceComponentData::fromPayload($component),
            $components,
        );
    }
}
