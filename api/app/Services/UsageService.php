<?php

declare(strict_types=1);

namespace App\Services;

use App\Domain\Usage\InvoicedPeriod;
use App\Domain\Usage\UsagePeriod;
use App\Domain\Usage\UsageResult;
use App\Domain\Usage\UsageSource;
use App\Domain\Usage\UsageWindow;
use App\Integrations\CustomerDataApi\CustomerDataApiConnector;
use App\Integrations\CustomerDataApi\Data\UsagePeriodData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\Exceptions\CustomerDataApiAuthException;
use App\Integrations\CustomerDataApi\Exceptions\CustomerDataApiRequestFailedException;
use App\Integrations\CustomerDataApi\Requests\GetUsagePeriodRequest;
use App\Integrations\CustomerDataApi\Requests\GetUsageRequest;
use App\Integrations\CustomerDataApi\StaleOnErrorCache;
use Carbon\CarbonImmutable;
use Closure;
use Saloon\Exceptions\Request\FatalRequestException;

/**
 * Usage page data: one day/month/year of usage, summed per bucket by KVS,
 * from both sources — the invoiced load profile and the metered Lastgang
 * that is not invoiced yet (KVS returns the latter only after the last
 * invoiced slot, so the two never overlap) — plus the span either source
 * covers, so the client can offer exactly those periods.
 *
 * Without an explicit `?date` the window is the one containing the newest
 * slot of either source; a contract without any slot shows yesterday,
 * empty. All KVS reads go through the StaleOnErrorCache like the day charts.
 */
final readonly class UsageService
{
    public function __construct(
        private CustomerDataApiConnector $connector,
        private StaleOnErrorCache $staleCache,
        private ContractService $contracts,
    ) {}

    /**
     * Longest custom window still shown day by day; beyond that month by month.
     */
    private const int MAX_DAILY_RANGE_DAYS = 92;

    /**
     * One calendar period.
     */
    public function usage(int $contractNumber, UsagePeriod $period, ?CarbonImmutable $date = null): UsageResult
    {
        $available = $this->available($contractNumber);

        // The `until` of the span is the end of the last slot, which on a
        // period boundary already lies in the next (empty) period.
        $center = $date ?? $available?->until->subSecond() ?? CarbonImmutable::yesterday();
        $from = $period->start($center);

        return $this->assemble($contractNumber, $period, $from, $period->next($from), $available);
    }

    /**
     * A window with its own bounds, e.g. an invoice period: days when it is
     * short enough, months otherwise.
     *
     * @param  CarbonImmutable  $until  exclusive
     */
    public function range(int $contractNumber, CarbonImmutable $from, CarbonImmutable $until): UsageResult
    {
        $from = $from->startOfDay();
        $until = $until->startOfDay();
        $bucketing = $from->diffInDays($until) <= self::MAX_DAILY_RANGE_DAYS ? UsagePeriod::Month : UsagePeriod::Year;

        return $this->assemble($contractNumber, $bucketing, $from, $until, $this->available($contractNumber));
    }

    private function assemble(
        int $contractNumber,
        UsagePeriod $bucketing,
        CarbonImmutable $from,
        CarbonImmutable $until,
        ?UsagePeriodData $available,
    ): UsageResult {
        return new UsageResult(
            window: UsageWindow::build(
                $bucketing,
                $from,
                $until,
                $this->buckets($contractNumber, UsageSource::Billed, $bucketing, $from, $until),
                $this->unbilledBuckets($contractNumber, $bucketing, $from, $until),
            ),
            available: $available,
            invoiced: $this->invoiced($contractNumber, $from, $until),
        );
    }

    private function available(int $contractNumber): ?UsagePeriodData
    {
        return UsagePeriodData::union(
            $this->period($contractNumber, UsageSource::Billed),
            $this->period($contractNumber, UsageSource::Unbilled),
        );
    }

    /**
     * The invoices tiling the window, if any — the contract itself is a
     * cached read, and its failure must not take the usage down.
     */
    private function invoiced(int $contractNumber, CarbonImmutable $from, CarbonImmutable $until): ?InvoicedPeriod
    {
        $contract = $this->optional(fn () => $this->contracts->find($contractNumber));

        return $contract === null ? null : InvoicedPeriod::covering($contract->invoices, $from, $until);
    }

    /**
     * The provisional source is optional: a KVS without the route (or a
     * contract KVS cannot price) must not take the invoiced usage down.
     *
     * @return list<\App\Integrations\CustomerDataApi\Data\UsageBucketData>
     */
    private function unbilledBuckets(int $contractNumber, UsagePeriod $period, CarbonImmutable $from, CarbonImmutable $until): array
    {
        try {
            return $this->buckets($contractNumber, UsageSource::Unbilled, $period, $from, $until);
        } catch (ContractNotFoundException) {
            return [];
        }
    }

    /**
     * A read whose absence or failure only removes a detail from the page:
     * deliberate KVS answers (404, 401), failed responses and connection
     * trouble alike yield null.
     *
     * @template T
     *
     * @param  Closure(): T  $read
     * @return T|null
     */
    private function optional(Closure $read): mixed
    {
        try {
            return $read();
        } catch (ContractNotFoundException|CustomerDataApiAuthException|CustomerDataApiRequestFailedException|FatalRequestException) {
            return null;
        }
    }

    /**
     * @return list<\App\Integrations\CustomerDataApi\Data\UsageBucketData>
     */
    private function buckets(int $contractNumber, UsageSource $source, UsagePeriod $period, CarbonImmutable $from, CarbonImmutable $until): array
    {
        return $this->staleCache->remember(
            "usage:{$source->value}:{$contractNumber}:{$period->resolution()}:{$from->toDateString()}:{$until->toDateString()}",
            function () use ($contractNumber, $source, $period, $from, $until): array {
                $request = new GetUsageRequest(
                    contractNumber: $contractNumber,
                    source: $source,
                    from: $from,
                    until: $until,
                    resolution: $period->resolution(),
                );

                return $request->createDtoFromResponse($this->connector->send($request));
            },
        );
    }

    /**
     * No slot of that source yet (404) or KVS trouble: the usage calls
     * themselves decide whether the page can be shown.
     */
    private function period(int $contractNumber, UsageSource $source): ?UsagePeriodData
    {
        return $this->optional(fn (): UsagePeriodData => $this->staleCache->remember(
            "usage:{$source->value}-period:{$contractNumber}",
            function () use ($contractNumber, $source): UsagePeriodData {
                $request = new GetUsagePeriodRequest($contractNumber, $source);

                return $request->createDtoFromResponse($this->connector->send($request));
            },
        ));
    }
}
