<?php

declare(strict_types=1);

namespace App\Domain\Usage;

/**
 * Where a usage value comes from: the invoiced load profile of the dynamic
 * tariff, or the metered Lastgang KVS has not invoiced yet, priced
 * provisionally with spot prices and the current tariff components.
 */
enum UsageSource: string
{
    case Billed = 'billed';
    case Unbilled = 'unbilled';

    /**
     * Path segment of the KVS customer-data-api routes.
     */
    public function path(): string
    {
        return match ($this) {
            self::Billed => 'billed-load-profiles',
            self::Unbilled => 'unbilled-load-profiles',
        };
    }
}
