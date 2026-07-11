<?php

declare(strict_types=1);

namespace App\Domain\LoadProfile;

use App\Integrations\CustomerDataApi\Data\BilledLoadProfileEntryData;
use App\Integrations\CustomerDataApi\Data\PriceComponentData;

/**
 * Pure port of the legal/supplier cost split arithmetic from the old
 * ContractLoadProfileRepository::set():
 *
 *  - only components of type "working_price" count,
 *  - amounts are EUR/kWh and converted to ct/kWh (× 100),
 *  - "supplierWorkingPrice" → supplier costs,
 *  - "supplierPurchasePrice" is skipped (Börsenstrompreis — already part of
 *    the stock exchange price),
 *  - everything else → legal costs,
 *  - stock exchange price: `cent_mwh / 1000` → ct/kWh.
 */
final readonly class BilledLoadProfileCalculator
{
    public function calculateEntry(BilledLoadProfileEntryData $entry): LoadProfileCosts
    {
        return $this->calculate($entry->priceComponents, $entry->centMwh);
    }

    /**
     * @param  list<PriceComponentData>  $priceComponents
     */
    public function calculate(array $priceComponents, float $centMwh): LoadProfileCosts
    {
        $legalCents = 0.0;
        $supplierCents = 0.0;

        foreach ($priceComponents as $component) {
            if ($component->type !== PriceComponentData::TYPE_WORKING_PRICE) {
                continue;
            }

            $cents = $component->amount * 100;

            if ($component->name === PriceComponentData::SUPPLIER_WORKING_PRICE) {
                $supplierCents += $cents;
            } elseif ($component->name === PriceComponentData::SUPPLIER_PURCHASE_PRICE) {
                // Börsenstrompreis — bereits im Börsenpreis (cent_mwh) enthalten.
            } else {
                $legalCents += $cents;
            }
        }

        return new LoadProfileCosts(
            legalCostsCentKwh: $legalCents,
            supplierCostsCentKwh: $supplierCents,
            stockExchangeCentKwh: $centMwh / 1000,
        );
    }
}
