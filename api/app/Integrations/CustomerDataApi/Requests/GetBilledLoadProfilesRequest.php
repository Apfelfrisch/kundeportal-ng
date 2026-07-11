<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Requests;

use App\Integrations\CustomerDataApi\Data\BilledLoadProfileEntryData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\Exceptions\InvalidApiPayloadException;
use App\Integrations\CustomerDataApi\ProvidesNotFoundMessages;
use Carbon\CarbonImmutable;
use Saloon\Enums\Method;
use Saloon\Http\Request;
use Saloon\Http\Response;

/**
 * GET /contract/{contractNumber}/billed-load-profiles?from=Y-m-d&until=Y-m-d —
 * endpoint path verified against the old ContractLoadProfileRepository::set().
 *
 * Date-window logic of the old BilledContractLoadProfileController (to be
 * re-implemented in phase 7, NOT here): center = `?date` param, else the
 * last-billing-date (fallback: yesterday); window shown = center ± 1 day;
 * the API is queried with from = center - 1 day and until = center + 2 days.
 */
final class GetBilledLoadProfilesRequest extends Request implements ProvidesNotFoundMessages
{
    protected Method $method = Method::GET;

    public function __construct(
        private readonly int $contractNumber,
        private readonly CarbonImmutable $from,
        private readonly CarbonImmutable $until,
    ) {}

    public function resolveEndpoint(): string
    {
        return "/contract/{$this->contractNumber}/billed-load-profiles";
    }

    /**
     * @return array<string, string>
     */
    protected function defaultQuery(): array
    {
        return [
            'from' => $this->from->format('Y-m-d'),
            'until' => $this->until->format('Y-m-d'),
        ];
    }

    /**
     * @return list<BilledLoadProfileEntryData>
     */
    public function createDtoFromResponse(Response $response): array
    {
        $data = $response->json('data');

        if (! is_array($data)) {
            throw new ContractNotFoundException($this->emptyResponseMessage());
        }

        $entries = [];

        foreach (array_values($data) as $index => $entry) {
            if (! is_array($entry)) {
                throw InvalidApiPayloadException::wrongType('data.'.$index, 'array', $entry);
            }

            $entries[] = BilledLoadProfileEntryData::fromArray($entry);
        }

        return $entries;
    }

    public function notFoundMessage(): string
    {
        return "Vertrag {$this->contractNumber} wurde im System nicht gefunden. Fehlercode 404.";
    }

    public function emptyResponseMessage(): string
    {
        return "Vertrag {$this->contractNumber} wurde im System nicht gefunden. Rückgabe leer.";
    }
}
