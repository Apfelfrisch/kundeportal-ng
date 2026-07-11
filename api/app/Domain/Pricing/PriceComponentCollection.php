<?php

declare(strict_types=1);

namespace App\Domain\Pricing;

use App\Integrations\CustomerDataApi\Data\PriceComponentData;

/**
 * Pricing logic over a list of tariff price components, ported from the old
 * Contract model. The backend emits raw numerics — the German number
 * formatting of the old model moved to the frontend.
 */
final readonly class PriceComponentCollection
{
    /**
     * @param  list<PriceComponentData>  $components
     */
    public function __construct(
        private array $components,
    ) {}

    /**
     * @return list<PriceComponentData>
     */
    public function all(): array
    {
        return $this->components;
    }

    public function isEmpty(): bool
    {
        return $this->components === [];
    }

    /**
     * Old Contract::basePriceComponents(): German label => amount in EUR
     * (base price components are NOT converted to cents and zero amounts
     * are NOT skipped).
     *
     * @return array<string, float>
     */
    public function translatedAmounts(): array
    {
        $amounts = [];

        foreach ($this->components as $component) {
            $amounts[TariffComponentTranslation::translate($component->name)] = $component->amount;
        }

        return $amounts;
    }

    /**
     * Old Contract::workingPriceComponents(): German label => amount in
     * ct/kWh (amount × 100). Zero amounts are skipped; for dynamic tariffs
     * the supplierPurchasePrice ("Beschaffungskosten") is skipped because
     * the purchase is already part of the stock exchange price.
     *
     * @return array<string, float>
     */
    public function translatedCentAmounts(bool $dynamic = false): array
    {
        $amounts = [];

        foreach ($this->components as $component) {
            if ($dynamic && $component->name === PriceComponentData::SUPPLIER_PURCHASE_PRICE) {
                continue;
            }

            if ($component->amount === 0.0) {
                continue;
            }

            $amounts[TariffComponentTranslation::translate($component->name)] = $component->amount * 100;
        }

        return $amounts;
    }

    /**
     * Old Contract::calculatedDynamicWorkingPrice(): the sum of all working
     * price components except the supplierPurchasePrice, in ct/kWh.
     */
    public function calculatedDynamicWorkingPriceCt(): float
    {
        $workingPrice = 0.0;

        foreach ($this->components as $component) {
            if ($component->name === PriceComponentData::SUPPLIER_PURCHASE_PRICE) {
                continue;
            }

            $workingPrice += $component->amount;
        }

        return $workingPrice * 100;
    }
}
