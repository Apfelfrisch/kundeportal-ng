<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Requests;

use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\Exceptions\InvalidApiPayloadException;
use App\Integrations\CustomerDataApi\ProvidesNotFoundMessages;
use Saloon\Contracts\Body\HasBody;
use Saloon\Enums\Method;
use Saloon\Http\Request;
use Saloon\Http\Response;
use Saloon\Traits\Body\HasJsonBody;

/**
 * POST /contracts/by-ids with body {"ids": [...]} — endpoint path verified
 * against the old ContractsRepository::setFromContractIds().
 */
final class GetContractsByIdsRequest extends Request implements HasBody, ProvidesNotFoundMessages
{
    use HasJsonBody;

    protected Method $method = Method::POST;

    /**
     * @param  list<int>  $contractNumbers
     */
    public function __construct(
        private readonly array $contractNumbers,
    ) {}

    public function resolveEndpoint(): string
    {
        return '/contracts/by-ids';
    }

    /**
     * @return array{ids: list<int>}
     */
    protected function defaultBody(): array
    {
        return ['ids' => $this->contractNumbers];
    }

    /**
     * @return list<ContractData>
     */
    public function createDtoFromResponse(Response $response): array
    {
        $data = $response->json('data');

        if (! is_array($data)) {
            throw new ContractNotFoundException($this->emptyResponseMessage());
        }

        $contracts = [];

        foreach (array_values($data) as $index => $contractData) {
            if (! is_array($contractData)) {
                throw InvalidApiPayloadException::wrongType('data.'.$index, 'array', $contractData);
            }

            $contracts[] = ContractData::fromArray($contractData);
        }

        return $contracts;
    }

    public function notFoundMessage(): string
    {
        return 'Keine Verträge gefunden. Fehlercode 404.';
    }

    public function emptyResponseMessage(): string
    {
        return 'Keine Verträge gefunden. Rückgabe leer.';
    }
}
