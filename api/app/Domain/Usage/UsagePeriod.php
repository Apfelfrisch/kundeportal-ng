<?php

declare(strict_types=1);

namespace App\Domain\Usage;

use Carbon\CarbonImmutable;

/**
 * The three zoom levels of the usage page and how each one is bucketed:
 * a day in hours, a month in days, a year in months.
 */
enum UsagePeriod: string
{
    case Day = 'day';
    case Month = 'month';
    case Year = 'year';

    /**
     * Bucket resolution the KVS usage endpoint is asked for.
     */
    public function resolution(): string
    {
        return match ($this) {
            self::Day => 'hour',
            self::Month => 'day',
            self::Year => 'month',
        };
    }

    public function start(CarbonImmutable $date): CarbonImmutable
    {
        return match ($this) {
            self::Day => $date->startOfDay(),
            self::Month => $date->startOfMonth(),
            self::Year => $date->startOfYear(),
        };
    }

    public function next(CarbonImmutable $start): CarbonImmutable
    {
        return match ($this) {
            self::Day => $start->addDay(),
            self::Month => $start->addMonth(),
            self::Year => $start->addYear(),
        };
    }

    public function previous(CarbonImmutable $start): CarbonImmutable
    {
        return match ($this) {
            self::Day => $start->subDay(),
            self::Month => $start->subMonth(),
            self::Year => $start->subYear(),
        };
    }

    /**
     * Calendar start of the bucket a moment falls into — the key KVS groups
     * its rows by (hour, day or month start).
     */
    public function alignBucket(CarbonImmutable $moment): CarbonImmutable
    {
        return match ($this) {
            self::Day => $moment->startOfHour(),
            self::Month => $moment->startOfDay(),
            self::Year => $moment->startOfMonth(),
        };
    }

    public function nextBucket(CarbonImmutable $bucketStart): CarbonImmutable
    {
        return match ($this) {
            self::Day => $bucketStart->addHour(),
            self::Month => $bucketStart->addDay(),
            self::Year => $bucketStart->addMonth(),
        };
    }
}
