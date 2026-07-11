<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\LoadProfile;

use App\Domain\LoadProfile\BilledLoadProfileCalculator;
use App\Integrations\CustomerDataApi\Data\BilledLoadProfileEntryData;
use App\Integrations\CustomerDataApi\Data\PriceComponentData;
use PHPUnit\Framework\TestCase;

final class BilledLoadProfileCalculatorTest extends TestCase
{
    public function test_it_splits_working_price_components_into_legal_and_supplier_costs(): void
    {
        $costs = new BilledLoadProfileCalculator()->calculate([
            new PriceComponentData('supplierWorkingPrice', 0.02, 'working_price'),
            new PriceComponentData('supplierPurchasePrice', 0.08, 'working_price'),
            new PriceComponentData('workingPrice', 0.0721, 'working_price'),
            new PriceComponentData('eegFee', 0.0205, 'working_price'),
            new PriceComponentData('supplierBasePrice', 8.5, 'base_price'),
        ], 8213.0);

        // supplierWorkingPrice → supplier costs.
        $this->assertEqualsWithDelta(2.0, $costs->supplierCostsCentKwh, 1e-9);
        // workingPrice + eegFee → legal costs; supplierPurchasePrice and base_price components are skipped.
        $this->assertEqualsWithDelta(9.26, $costs->legalCostsCentKwh, 1e-9);
        // cent_mwh / 1000 → ct/kWh.
        $this->assertEqualsWithDelta(8.213, $costs->stockExchangeCentKwh, 1e-9);
    }

    public function test_it_handles_entries_without_price_components(): void
    {
        $costs = new BilledLoadProfileCalculator()->calculate([], 7950.5);

        $this->assertSame(0.0, $costs->legalCostsCentKwh);
        $this->assertSame(0.0, $costs->supplierCostsCentKwh);
        $this->assertEqualsWithDelta(7.9505, $costs->stockExchangeCentKwh, 1e-9);
    }

    public function test_it_calculates_directly_from_a_load_profile_entry(): void
    {
        $entry = BilledLoadProfileEntryData::fromArray([
            'id' => 1,
            'from' => '2025-06-10 00:00:00',
            'until' => '2025-06-10 00:15:00',
            'usage_kwh' => 0.35,
            'cent_mwh' => 8213,
            'price_components' => [
                ['name' => 'supplierWorkingPrice', 'type' => 'working_price', 'amount' => 0.02],
                ['name' => 'workingPrice', 'type' => 'working_price', 'amount' => 0.0721],
            ],
        ]);

        $costs = new BilledLoadProfileCalculator()->calculateEntry($entry);

        $this->assertEqualsWithDelta(2.0, $costs->supplierCostsCentKwh, 1e-9);
        $this->assertEqualsWithDelta(7.21, $costs->legalCostsCentKwh, 1e-9);
        $this->assertEqualsWithDelta(8.213, $costs->stockExchangeCentKwh, 1e-9);
    }
}
