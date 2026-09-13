<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\Usage;

use App\Domain\Usage\UsagePeriod;
use App\Domain\Usage\UsageWindow;
use App\Integrations\CustomerDataApi\Data\UsageBucketData;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

final class UsageWindowTest extends TestCase
{
    public function test_a_month_is_filled_with_one_bucket_per_day(): void
    {
        $window = UsageWindow::build(UsagePeriod::Month, CarbonImmutable::parse('2025-06-01'), CarbonImmutable::parse('2025-07-01'), [
            $this->row('2025-06-02', usageKwh: 8.0, legalCt: 74.08, supplierCt: 16.0, stockExchangeCt: -3.2),
        ]);

        $this->assertCount(30, $window->buckets);
        $this->assertSame('2025-07-01 00:00:00', $window->until->toDateTimeString());

        $first = $window->buckets[0];
        $this->assertFalse($first->hasData);
        $this->assertSame(0.0, $first->usageKwh);
        $this->assertNull($first->averageCtKwh());

        $second = $window->buckets[1];
        $this->assertTrue($second->hasData);
        // No plain price from KVS: the weighted price fills in.
        $this->assertEqualsWithDelta(10.86, $second->priceCtKwh, 0.0001);
        $this->assertSame('2025-06-02 00:00:00', $second->from->toDateTimeString());
        $this->assertSame('2025-06-03 00:00:00', $second->until->toDateTimeString());
        $this->assertSame(8.0, $second->usageKwh);
        $this->assertSame(0.0, $second->unbilledKwh);
        $this->assertEqualsWithDelta(86.88, $second->totalCt(), 0.0001);
        $this->assertEqualsWithDelta(10.86, $second->averageCtKwh(), 0.0001);
    }

    public function test_billed_and_unbilled_rows_of_the_same_bucket_are_added_up(): void
    {
        $window = UsageWindow::build(
            UsagePeriod::Month,
            CarbonImmutable::parse('2025-06-01'),
            CarbonImmutable::parse('2025-07-01'),
            [$this->row('2025-06-30', usageKwh: 4.0, legalCt: 36.0, supplierCt: 8.0, stockExchangeCt: 30.0)],
            [
                $this->row('2025-06-30', usageKwh: 6.0, legalCt: 54.0, supplierCt: 12.0, stockExchangeCt: 45.0),
                $this->row('2025-06-29', usageKwh: 2.0, legalCt: 18.0, supplierCt: 4.0, stockExchangeCt: 10.0),
            ],
        );

        $last = $window->buckets[29];
        $this->assertTrue($last->hasData);
        $this->assertSame(10.0, $last->usageKwh);
        $this->assertSame(6.0, $last->unbilledKwh);
        $this->assertSame(185.0, $last->totalCt());
        $this->assertSame(111.0, $last->unbilledCt);

        $unbilledOnly = $window->buckets[28];
        $this->assertSame(2.0, $unbilledOnly->usageKwh);
        $this->assertSame(2.0, $unbilledOnly->unbilledKwh);

        $totals = $window->totals();
        $this->assertSame(12.0, $totals->usageKwh);
        $this->assertSame(8.0, $totals->unbilledKwh);
        $this->assertSame(143.0, $totals->unbilledCt);
    }

    public function test_a_day_is_filled_with_one_bucket_per_hour(): void
    {
        $window = UsageWindow::build(UsagePeriod::Day, CarbonImmutable::parse('2025-06-10'), CarbonImmutable::parse('2025-06-11'), [
            $this->row('2025-06-10 13:00:00', usageKwh: 1.5, legalCt: 10.0, supplierCt: 2.0, stockExchangeCt: 5.0),
        ]);

        $this->assertCount(24, $window->buckets);
        $this->assertTrue($window->buckets[13]->hasData);
        $this->assertSame('2025-06-10 14:00:00', $window->buckets[13]->until->toDateTimeString());
    }

    public function test_a_year_is_filled_with_twelve_months(): void
    {
        $window = UsageWindow::build(UsagePeriod::Year, CarbonImmutable::parse('2025-01-01'), CarbonImmutable::parse('2026-01-01'), [
            $this->row('2025-06-01', usageKwh: 100.0, legalCt: 900.0, supplierCt: 200.0, stockExchangeCt: 800.0),
            $this->row('2025-07-01', usageKwh: 50.0, legalCt: 450.0, supplierCt: 100.0, stockExchangeCt: 300.0),
        ]);

        $this->assertCount(12, $window->buckets);
        $this->assertSame('2025-12-01 00:00:00', $window->buckets[11]->from->toDateTimeString());
        $this->assertSame('2026-01-01 00:00:00', $window->buckets[11]->until->toDateTimeString());

        $totals = $window->totals();
        $this->assertTrue($totals->hasData);
        $this->assertSame(150.0, $totals->usageKwh);
        $this->assertSame(2750.0, $totals->totalCt());
        $this->assertEqualsWithDelta(18.3333, $totals->averageCtKwh(), 0.0001);
    }

    public function test_a_bucket_without_usage_falls_back_to_the_plain_slot_price(): void
    {
        $window = UsageWindow::build(UsagePeriod::Day, CarbonImmutable::parse('2025-06-10'), CarbonImmutable::parse('2025-06-11'), [
            new UsageBucketData(CarbonImmutable::parse('2025-06-10 12:00:00'), 0.0, 0.0, 0.0, 0.0, 12.5),
            new UsageBucketData(CarbonImmutable::parse('2025-06-10 13:00:00'), 2.0, 20.0, 4.0, 6.0, 14.0),
        ]);

        $this->assertTrue($window->buckets[12]->hasData);
        $this->assertNull($window->buckets[12]->averageCtKwh());
        $this->assertSame(12.5, $window->buckets[12]->priceCtKwh);
        $this->assertSame(15.0, $window->buckets[13]->averageCtKwh());
        $this->assertNull($window->buckets[0]->averageCtKwh());
        $this->assertSame(13.25, $window->totals()->priceCtKwh);
    }

    public function test_base_prices_count_towards_the_costs_but_not_the_price_per_kwh(): void
    {
        $window = UsageWindow::build(
            UsagePeriod::Day,
            CarbonImmutable::parse('2025-06-10'),
            CarbonImmutable::parse('2025-06-11'),
            [new UsageBucketData(CarbonImmutable::parse('2025-06-10 12:00:00'), 2.0, 20.0, 4.0, 6.0, 14.0, 1.5, 3.0)],
            [new UsageBucketData(CarbonImmutable::parse('2025-06-10 12:00:00'), 1.0, 10.0, 2.0, 3.0, 14.0, 0.5, 1.0)],
        );

        $bucket = $window->buckets[12];
        $this->assertSame(2.0, $bucket->supplierBaseCt);
        $this->assertSame(4.0, $bucket->legalBaseCt);
        $this->assertSame(6.0, $bucket->baseCt());
        $this->assertSame(51.0, $bucket->totalCt());
        $this->assertSame(16.5, $bucket->unbilledCt);
        $this->assertSame(15.0, $bucket->averageCtKwh());
        $this->assertSame(6.0, $window->totals()->baseCt());
    }

    public function test_a_custom_window_keeps_its_own_bounds(): void
    {
        $window = UsageWindow::build(UsagePeriod::Month, CarbonImmutable::parse('2025-05-02'), CarbonImmutable::parse('2025-06-16'), []);

        $this->assertCount(45, $window->buckets);
        $this->assertSame('2025-05-02 00:00:00', $window->buckets[0]->from->toDateTimeString());
        $this->assertSame('2025-06-16 00:00:00', $window->until->toDateTimeString());
    }

    public function test_a_long_custom_window_starting_mid_month_has_partial_calendar_buckets(): void
    {
        $window = UsageWindow::build(
            UsagePeriod::Year,
            CarbonImmutable::parse('2025-06-15'),
            CarbonImmutable::parse('2026-06-15'),
            [
                // KVS groups by calendar month, restricted to the window: June holds 15.–30.
                $this->row('2025-06-01', usageKwh: 40.0, legalCt: 360.0, supplierCt: 80.0, stockExchangeCt: 300.0),
                $this->row('2026-06-01', usageKwh: 30.0, legalCt: 270.0, supplierCt: 60.0, stockExchangeCt: 200.0),
            ],
        );

        $this->assertCount(13, $window->buckets);
        $this->assertSame('2025-06-15 00:00:00', $window->buckets[0]->from->toDateTimeString());
        $this->assertSame('2025-07-01 00:00:00', $window->buckets[0]->until->toDateTimeString());
        $this->assertSame(40.0, $window->buckets[0]->usageKwh);
        $this->assertSame('2025-07-01 00:00:00', $window->buckets[1]->from->toDateTimeString());
        $this->assertSame('2026-06-01 00:00:00', $window->buckets[12]->from->toDateTimeString());
        $this->assertSame('2026-06-15 00:00:00', $window->buckets[12]->until->toDateTimeString());
        $this->assertSame(30.0, $window->buckets[12]->usageKwh);
        $this->assertSame(70.0, $window->totals()->usageKwh);
    }

    public function test_the_totals_of_an_empty_window_have_no_data(): void
    {
        $totals = UsageWindow::build(UsagePeriod::Day, CarbonImmutable::parse('2025-06-10'), CarbonImmutable::parse('2025-06-11'), [])->totals();

        $this->assertFalse($totals->hasData);
        $this->assertNull($totals->averageCtKwh());
    }

    private function row(string $from, float $usageKwh, float $legalCt, float $supplierCt, float $stockExchangeCt): UsageBucketData
    {
        return new UsageBucketData(CarbonImmutable::parse($from), $usageKwh, $legalCt, $supplierCt, $stockExchangeCt);
    }
}
