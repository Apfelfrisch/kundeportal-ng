<?php

declare(strict_types=1);

namespace App\Domain\Usage;

use App\Integrations\CustomerDataApi\Data\UsageBucketData;
use Carbon\CarbonImmutable;

/**
 * One window of usage as a gapless list of buckets: every hour/day/month of
 * the window is present, KVS rows of both sources are matched by their
 * bucket start and added up, missing ones stay empty. Buckets stay aligned
 * to the calendar, so a window starting mid-month (an invoice period)
 * begins with a partial one.
 */
final readonly class UsageWindow
{
    /**
     * @param  list<UsageBucket>  $buckets
     */
    private function __construct(
        public UsagePeriod $period,
        public CarbonImmutable $from,
        /** Exclusive end of the window. */
        public CarbonImmutable $until,
        public array $buckets,
    ) {}

    /**
     * @param  UsagePeriod  $period  bucket size: a day in hours, a month in days, a year in months
     * @param  CarbonImmutable  $until  exclusive
     * @param  list<UsageBucketData>  $billed
     * @param  list<UsageBucketData>  $unbilled
     */
    public static function build(UsagePeriod $period, CarbonImmutable $from, CarbonImmutable $until, array $billed, array $unbilled = []): self
    {

        $billedByStart = self::keyByStart($billed);
        $unbilledByStart = self::keyByStart($unbilled);

        $buckets = [];

        for ($start = $from; $start < $until; $start = $end) {
            $aligned = $period->alignBucket($start);
            $end = min($period->nextBucket($aligned), $until);
            $key = $aligned->format('Y-m-d H:i:s');
            if (! isset($billedByStart[$key]) && ! isset($unbilledByStart[$key])) {
                $buckets[] = UsageBucket::empty($start, $end);

                continue;
            }

            $billedRow = $billedByStart[$key] ?? UsageBucketData::zero($aligned);
            $unbilledRow = $unbilledByStart[$key] ?? UsageBucketData::zero($aligned);

            // On the autumn DST day 02:00 local time comes around twice; KVS
            // merges both hours into one row, which must not be counted twice.
            unset($billedByStart[$key], $unbilledByStart[$key]);

            $bucket = new UsageBucket(
                from: $start,
                until: $end,
                usageKwh: $billedRow->usageKwh + $unbilledRow->usageKwh,
                unbilledKwh: $unbilledRow->usageKwh,
                legalCt: $billedRow->legalCt + $unbilledRow->legalCt,
                supplierCt: $billedRow->supplierCt + $unbilledRow->supplierCt,
                stockExchangeCt: $billedRow->stockExchangeCt + $unbilledRow->stockExchangeCt,
                unbilledCt: $unbilledRow->totalCt(),
                hasData: true,
                priceCtKwh: $billedRow->priceCtKwh ?? $unbilledRow->priceCtKwh,
                supplierBaseCt: $billedRow->supplierBaseCt + $unbilledRow->supplierBaseCt,
                legalBaseCt: $billedRow->legalBaseCt + $unbilledRow->legalBaseCt,
            );

            // A KVS without the plain slot price (older version): the weighted
            // price is the best the bucket has, so the client never needs a fallback.
            $buckets[] = $bucket->priceCtKwh === null ? $bucket->withPriceCtKwh($bucket->averageCtKwh()) : $bucket;
        }

        return new self($period, $from, $until, $buckets);
    }

    public function totals(): UsageBucket
    {
        $sum = fn (string $property): float => array_sum(array_column($this->buckets, $property));
        $prices = array_filter(array_column($this->buckets, 'priceCtKwh'), static fn (?float $price): bool => $price !== null);

        return new UsageBucket(
            from: $this->from,
            until: $this->until,
            usageKwh: $sum('usageKwh'),
            unbilledKwh: $sum('unbilledKwh'),
            legalCt: $sum('legalCt'),
            supplierCt: $sum('supplierCt'),
            stockExchangeCt: $sum('stockExchangeCt'),
            unbilledCt: $sum('unbilledCt'),
            hasData: array_any($this->buckets, static fn (UsageBucket $bucket): bool => $bucket->hasData),
            priceCtKwh: $prices === [] ? null : array_sum($prices) / count($prices),
            supplierBaseCt: $sum('supplierBaseCt'),
            legalBaseCt: $sum('legalBaseCt'),
        );
    }

    /**
     * @param  list<UsageBucketData>  $rows
     * @return array<string, UsageBucketData>
     */
    private static function keyByStart(array $rows): array
    {
        $byStart = [];

        foreach ($rows as $row) {
            $byStart[$row->from->format('Y-m-d H:i:s')] = $row;
        }

        return $byStart;
    }
}
