<?php

declare(strict_types=1);

namespace App\Services;

use App\Domain\LoadProfile\BilledLoadProfileCalculator;
use App\Domain\LoadProfile\LoadProfileCosts;
use App\Integrations\CustomerDataApi\CustomerDataApiConnector;
use App\Integrations\CustomerDataApi\Data\BilledLoadProfileEntryData;
use App\Integrations\CustomerDataApi\Data\EdiLoadProfileEntryData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\Exceptions\CustomerDataApiAuthException;
use App\Integrations\CustomerDataApi\Exceptions\CustomerDataApiRequestFailedException;
use App\Integrations\CustomerDataApi\Requests\GetBilledLoadProfilesRequest;
use App\Integrations\CustomerDataApi\Requests\GetEdiLoadProfilesRequest;
use App\Integrations\CustomerDataApi\Requests\GetLastBillingDateRequest;
use App\Integrations\CustomerDataApi\Requests\GetLastReadingDateRequest;
use App\Integrations\CustomerDataApi\StaleOnErrorCache;
use Carbon\CarbonImmutable;
use Saloon\Exceptions\Request\FatalRequestException;

/**
 * Billed/EDI load profile day windows, ported from the old
 * BilledContractLoadProfileController / ContractEdiLoadProfileController:
 *
 *  - center = explicit `?date`, else the contract's last-billing-date
 *    (billed) / last-reading-date (EDI); when that call is unsuccessful or
 *    yields no date, yesterday;
 *  - the shown window is center ± 1 day, the KVS API is queried with
 *    from = center - 1 day and until = center + 2 days.
 *
 * All KVS reads go through the StaleOnErrorCache: the date lookups and the
 * profile windows stay readable from the last known good copy while the
 * customer-data-api is down. Caching the date lookups keeps the window keys
 * aligned, so an outage replays the same day a healthy visit showed.
 */
final readonly class LoadProfileService
{
    public function __construct(
        private CustomerDataApiConnector $connector,
        private BilledLoadProfileCalculator $calculator,
        private StaleOnErrorCache $staleCache,
    ) {}

    /**
     * @return array{date: CarbonImmutable, entries: list<array{entry: BilledLoadProfileEntryData, costs: LoadProfileCosts}>}
     */
    public function billedDay(int $contractNumber, ?CarbonImmutable $date = null): array
    {
        $center = $date ?? $this->lastBillingDate($contractNumber) ?? CarbonImmutable::yesterday();

        $entries = $this->staleCache->remember(
            "load-profiles:billed:{$contractNumber}:{$center->toDateString()}",
            function () use ($contractNumber, $center): array {
                $request = new GetBilledLoadProfilesRequest(
                    contractNumber: $contractNumber,
                    from: $center->subDay(),
                    until: $center->addDays(2),
                );

                return $request->createDtoFromResponse($this->connector->send($request));
            },
        );

        $rows = [];

        foreach ($entries as $entry) {
            $rows[] = [
                'entry' => $entry,
                'costs' => $this->calculator->calculateEntry($entry),
            ];
        }

        return [
            'date' => $center,
            'entries' => $rows,
        ];
    }

    /**
     * @return array{date: CarbonImmutable, entries: list<EdiLoadProfileEntryData>}
     */
    public function ediDay(int $contractNumber, ?CarbonImmutable $date = null): array
    {
        $center = $date ?? $this->lastReadingDate($contractNumber) ?? CarbonImmutable::yesterday();

        return [
            'date' => $center,
            'entries' => $this->staleCache->remember(
                "load-profiles:edi:{$contractNumber}:{$center->toDateString()}",
                function () use ($contractNumber, $center): array {
                    $request = new GetEdiLoadProfilesRequest(
                        contractNumber: $contractNumber,
                        from: $center->subDay(),
                        until: $center->addDays(2),
                    );

                    return $request->createDtoFromResponse($this->connector->send($request));
                },
            ),
        ];
    }

    private function lastBillingDate(int $contractNumber): ?CarbonImmutable
    {
        return $this->lastDate(
            "load-profiles:last-billing-date:{$contractNumber}",
            new GetLastBillingDateRequest($contractNumber),
        );
    }

    private function lastReadingDate(int $contractNumber): ?CarbonImmutable
    {
        return $this->lastDate(
            "load-profiles:last-reading-date:{$contractNumber}",
            new GetLastReadingDateRequest($contractNumber),
        );
    }

    private function lastDate(
        string $cacheKey,
        GetLastBillingDateRequest|GetLastReadingDateRequest $request,
    ): ?CarbonImmutable {
        try {
            return $this->staleCache->remember(
                $cacheKey,
                fn (): ?CarbonImmutable => $request->createDtoFromResponse($this->connector->send($request)),
            );
        } catch (ContractNotFoundException|CustomerDataApiAuthException|CustomerDataApiRequestFailedException|FatalRequestException) {
            // Old-controller parity: any unsuccessful response falls back to
            // yesterday; connection failures without a cached date do too.
            return null;
        }
    }
}
