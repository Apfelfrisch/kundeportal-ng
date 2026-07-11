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
use Carbon\CarbonImmutable;

/**
 * Billed/EDI load profile day windows, ported from the old
 * BilledContractLoadProfileController / ContractEdiLoadProfileController:
 *
 *  - center = explicit `?date`, else the contract's last-billing-date
 *    (billed) / last-reading-date (EDI); when that call is unsuccessful or
 *    yields no date, yesterday;
 *  - the shown window is center ± 1 day, the KVS API is queried with
 *    from = center - 1 day and until = center + 2 days.
 */
final readonly class LoadProfileService
{
    public function __construct(
        private CustomerDataApiConnector $connector,
        private BilledLoadProfileCalculator $calculator,
    ) {}

    /**
     * @return array{date: CarbonImmutable, entries: list<array{entry: BilledLoadProfileEntryData, costs: LoadProfileCosts}>}
     */
    public function billedDay(int $contractNumber, ?CarbonImmutable $date = null): array
    {
        $center = $date ?? $this->lastBillingDate($contractNumber) ?? CarbonImmutable::yesterday();

        $request = new GetBilledLoadProfilesRequest(
            contractNumber: $contractNumber,
            from: $center->subDay(),
            until: $center->addDays(2),
        );

        $entries = $request->createDtoFromResponse($this->connector->send($request));

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

        $request = new GetEdiLoadProfilesRequest(
            contractNumber: $contractNumber,
            from: $center->subDay(),
            until: $center->addDays(2),
        );

        return [
            'date' => $center,
            'entries' => $request->createDtoFromResponse($this->connector->send($request)),
        ];
    }

    private function lastBillingDate(int $contractNumber): ?CarbonImmutable
    {
        $request = new GetLastBillingDateRequest($contractNumber);

        try {
            return $request->createDtoFromResponse($this->connector->send($request));
        } catch (ContractNotFoundException|CustomerDataApiAuthException|CustomerDataApiRequestFailedException) {
            // Old-controller parity: any unsuccessful response falls back to yesterday.
            return null;
        }
    }

    private function lastReadingDate(int $contractNumber): ?CarbonImmutable
    {
        $request = new GetLastReadingDateRequest($contractNumber);

        try {
            return $request->createDtoFromResponse($this->connector->send($request));
        } catch (ContractNotFoundException|CustomerDataApiAuthException|CustomerDataApiRequestFailedException) {
            // Old-controller parity: any unsuccessful response falls back to yesterday.
            return null;
        }
    }
}
