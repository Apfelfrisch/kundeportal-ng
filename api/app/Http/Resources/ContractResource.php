<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Pricing\Vat;
use App\Enums\ContractStatus;
use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Integrations\CustomerDataApi\Data\ContractFileData;
use App\Support\TenantConfig;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Full contract detail — every field the old contract/cards/*.blade.php and
 * offcanvas lists displayed, as raw numerics and ISO dates. Price semantics
 * ported from the old Contract model:
 *
 *  - working_price is EUR/kWh → ×100 = ct/kWh (formattedWorkingPrice)
 *  - base_price is EUR/month (formattedBasePrice, "pro Monat")
 *  - gross = net × 1.19 (Vat::RATE)
 *  - base price components are EUR/year, working price components ct/kWh
 */
final class ContractResource extends JsonResource
{
    public function __construct(
        private readonly ContractData $contract,
        private readonly TenantConfig $tenant,
    ) {
        parent::__construct($contract);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $contract = $this->contract;

        // Old Contract::isDynamic(): KVS price type AND the tenant flag.
        $isDynamic = $contract->isDynamic() && $this->tenant->dynamicElectricPrices;

        $workingPriceCt = $contract->workingPrice === null ? null : $contract->workingPrice * 100;

        return [
            'contract_number' => $contract->contractNumber,
            'customer_number' => $contract->customerNumber,
            'status' => [
                'id' => (int) $contract->status,
                'label' => ContractStatus::fromKvsId($contract->status)->value,
            ],
            'tariff' => $contract->tariff,
            'price_type' => $contract->priceType,
            'is_dynamic' => $isDynamic,
            'received_at' => $contract->receivedAt?->toDateString(),
            'delivery_start' => $contract->deliveryStart?->toDateString(),
            'delivery_end' => $contract->deliveryEnd?->toDateString(),
            'price_guarantee' => $contract->priceGuarantee?->toDateString(),
            'contract_term' => $contract->contractTerm?->toDateString(),
            'earliest_termination_date' => $contract->earliestTerminationDate?->toDateString(),
            'prices' => [
                'working_price_ct' => $workingPriceCt,
                'working_price_ct_gross' => $workingPriceCt === null ? null : Vat::gross($workingPriceCt),
                'base_price_eur' => $contract->basePrice,
                'base_price_eur_gross' => $contract->basePrice === null ? null : Vat::gross($contract->basePrice),
                'base_price_components' => $contract->basePriceComponentCollection()->translatedAmounts(),
                'working_price_components' => $contract->workingPriceComponentCollection()->translatedCentAmounts($isDynamic),
                'calculated_dynamic_working_price_ct' => $isDynamic
                    ? $contract->workingPriceComponentCollection()->calculatedDynamicWorkingPriceCt()
                    : null,
                'tariff_effective_from' => $contract->tariffEffectiveFrom?->toDateString(),
            ],
            'sales_partner' => $this->tenant->salesPartner($contract->salesPartnerId),
            'bank' => [
                // The old bank card displayed the full IBAN — kept unmasked.
                'iban' => $contract->iban,
                'bank' => $contract->bank,
                'account_owner' => $contract->accountOwner,
                'sepa' => $contract->sepa,
            ],
            'billing_contact' => [
                'company' => $contract->billingContactCompany,
                'salutation' => $contract->billingContactSalutation,
                'title' => $contract->billingContactTitle,
                'first_name' => $contract->billingContactFirstName,
                'last_name' => $contract->billingContactLastName,
            ],
            'billing_address' => [
                'zip' => $contract->zip,
                'city' => $contract->city,
                'street' => $contract->street,
                'street_number' => $contract->streetNumber,
                'address_additive' => $contract->addressAdditive,
            ],
            'contact' => [
                'phone' => $contract->phone,
                'mobile' => $contract->mobile,
                'mail' => $contract->mail,
                'send_emails' => $contract->sendEmails,
            ],
            'installment' => $this->installment(),
            'payment_plans' => PaymentPlanResource::collection($contract->paymentPlans),
            'meter_points' => MeterPointResource::collection($contract->meterPoints),
            'invoices' => InvoiceResource::collection($contract->invoices),
            'files' => ContractFileResource::collection($this->filesByCreatedAtDesc()),
            'payments' => ContractPaymentResource::collection($contract->contractPayments),
        ];
    }

    private function installment(): ?PaymentPlanResource
    {
        $paymentPlan = $this->contract->currentPaymentPlan(CarbonImmutable::now());

        return $paymentPlan === null ? null : new PaymentPlanResource($paymentPlan);
    }

    /**
     * The old offcanvas list sorted the files by created date, newest first.
     *
     * @return list<ContractFileData>
     */
    private function filesByCreatedAtDesc(): array
    {
        $files = $this->contract->contractFiles;

        usort(
            $files,
            static fn (ContractFileData $a, ContractFileData $b): int => ($b->createdAt?->getTimestamp() ?? PHP_INT_MIN) <=> ($a->createdAt?->getTimestamp() ?? PHP_INT_MIN),
        );

        return $files;
    }
}
