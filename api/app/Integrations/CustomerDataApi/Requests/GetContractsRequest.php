<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Requests;

use App\Integrations\CustomerDataApi\Data\ContractPageData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\ProvidesNotFoundMessages;
use Saloon\Enums\Method;
use Saloon\Http\Request;
use Saloon\Http\Response;

/**
 * GET /contracts?page=N — endpoint path verified against the old
 * AdminContractsRepository::set().
 */
final class GetContractsRequest extends Request implements ProvidesNotFoundMessages
{
    protected Method $method = Method::GET;

    public function __construct(
        private readonly int $page = 1,
    ) {}

    public function resolveEndpoint(): string
    {
        return '/contracts';
    }

    /**
     * @return array<string, int>
     */
    protected function defaultQuery(): array
    {
        return ['page' => $this->page];
    }

    public function createDtoFromResponse(Response $response): ContractPageData
    {
        $body = $response->json();

        if (! is_array($body['data'] ?? null)) {
            throw new ContractNotFoundException($this->emptyResponseMessage());
        }

        return ContractPageData::fromArray($body);
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
