<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\Pricing;

use App\Domain\Pricing\PriceComponentCollection;
use App\Integrations\CustomerDataApi\Data\PriceComponentData;
use PHPUnit\Framework\TestCase;

final class PriceComponentCollectionTest extends TestCase
{
    public function test_translated_amounts_keep_raw_euro_amounts_for_base_price_components(): void
    {
        $collection = new PriceComponentCollection([
            new PriceComponentData('supplierBasePrice', 8.5, 'base_price'),
            new PriceComponentData('baseFee', 2.75, 'base_price'),
            new PriceComponentData('measuringFee', 0.0, 'base_price'),
            new PriceComponentData('somethingUnknown', 1.0, 'base_price'),
        ]);

        // No cent conversion, no zero skipping, unknown names fall through untranslated.
        $this->assertSame([
            'Grundpreis Versorger' => 8.5,
            'Grundpreis Netzbetreiber' => 2.75,
            'Messung und Ablesung' => 0.0,
            'somethingUnknown' => 1.0,
        ], $collection->translatedAmounts());
    }

    public function test_translated_cent_amounts_convert_to_cents_and_skip_zero_amounts(): void
    {
        $amounts = $this->workingPriceCollection()->translatedCentAmounts();

        $this->assertEqualsWithDelta([
            'Arbeitspreis Versorger' => 5.0,
            'Beschaffungskosten' => 8.0,
            'Arbeitspreis Netzbetreiber' => 7.21,
            'Konzessionsabgabe' => 1.66,
        ], $amounts, 1e-9);

        $this->assertArrayNotHasKey('EEG-Umlage', $amounts);
    }

    public function test_translated_cent_amounts_skip_the_purchase_price_for_dynamic_tariffs(): void
    {
        $amounts = $this->workingPriceCollection()->translatedCentAmounts(dynamic: true);

        $this->assertArrayNotHasKey('Beschaffungskosten', $amounts);
        $this->assertEqualsWithDelta(5.0, $amounts['Arbeitspreis Versorger'], 1e-9);
    }

    public function test_calculated_dynamic_working_price_sums_everything_except_the_purchase_price(): void
    {
        // (0.05 + 0.0721 + 0.0166 + 0.0) * 100 — zero amounts count, purchase price does not.
        $this->assertEqualsWithDelta(
            13.87,
            $this->workingPriceCollection()->calculatedDynamicWorkingPriceCt(),
            1e-9,
        );
    }

    public function test_empty_collection(): void
    {
        $collection = new PriceComponentCollection([]);

        $this->assertTrue($collection->isEmpty());
        $this->assertSame([], $collection->all());
        $this->assertSame([], $collection->translatedAmounts());
        $this->assertSame([], $collection->translatedCentAmounts());
        $this->assertSame(0.0, $collection->calculatedDynamicWorkingPriceCt());
    }

    private function workingPriceCollection(): PriceComponentCollection
    {
        return new PriceComponentCollection([
            new PriceComponentData('supplierWorkingPrice', 0.05, 'working_price'),
            new PriceComponentData('supplierPurchasePrice', 0.08, 'working_price'),
            new PriceComponentData('workingPrice', 0.0721, 'working_price'),
            new PriceComponentData('concessionFee', 0.0166, 'working_price'),
            new PriceComponentData('eegFee', 0.0, 'working_price'),
        ]);
    }
}
