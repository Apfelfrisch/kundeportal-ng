<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Requests;

use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\ProvidesNotFoundMessages;
use Saloon\Enums\Method;
use Saloon\Http\Request;
use Saloon\Http\Response;

/**
 * GET /contract/{contractNumber} — endpoint path verified against the old
 * ContractRepository::set().
 */
final class GetContractRequest extends Request implements ProvidesNotFoundMessages
{
    protected Method $method = Method::GET;

    public function __construct(
        private readonly int $contractNumber,
    ) {}

    public function resolveEndpoint(): string
    {
        return "/contract/{$this->contractNumber}";
    }

    public function createDtoFromResponse(Response $response): ContractData
    {
        $data = $response->json('data');

        if (! is_array($data) || $data === []) {
            throw new ContractNotFoundException($this->emptyResponseMessage());
        }

        return ContractData::fromArray($data);
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
