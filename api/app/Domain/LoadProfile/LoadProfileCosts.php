<?php

declare(strict_types=1);

namespace App\Domain\LoadProfile;

/**
 * Cost split of one billed load profile slot, all values in ct/kWh.
 */
final readonly class LoadProfileCosts
{
    public function __construct(
        public float $legalCostsCentKwh,
        public float $supplierCostsCentKwh,
        public float $stockExchangeCentKwh,
    ) {}
}
