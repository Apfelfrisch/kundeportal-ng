<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Requests;

use App\Domain\Usage\UsageSource;
use App\Integrations\CustomerDataApi\Data\UsagePeriodData;
use App\Integrations\CustomerDataApi\ProvidesNotFoundMessages;
use Saloon\Enums\Method;
use Saloon\Http\Request;
use Saloon\Http\Response;

/**
 * GET /contract/{contractNumber}/{billed|unbilled}-load-profiles/period —
 * span of that usage source. KVS answers 404 when the source has no slot
 * at all; the service treats that as "nothing there yet".
 */
final class GetUsagePeriodRequest extends Request implements ProvidesNotFoundMessages
{
    protected Method $method = Method::GET;

    public function __construct(
        private readonly int $contractNumber,
        private readonly UsageSource $source,
    ) {}

    public function resolveEndpoint(): string
    {
        return "/contract/{$this->contractNumber}/{$this->source->path()}/period";
    }

    public function createDtoFromResponse(Response $response): UsagePeriodData
    {
        return UsagePeriodData::fromArray($response->json());
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
