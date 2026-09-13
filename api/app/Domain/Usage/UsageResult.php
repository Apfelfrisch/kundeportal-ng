<?php

declare(strict_types=1);

namespace App\Domain\Usage;

use App\Integrations\CustomerDataApi\Data\UsagePeriodData;

/**
 * What the usage page needs for one window: the buckets, the span either
 * source has data for, and the invoices tiling the window, if any.
 */
final readonly class UsageResult
{
    public function __construct(
        public UsageWindow $window,
        public ?UsagePeriodData $available,
        public ?InvoicedPeriod $invoiced,
    ) {}
}
