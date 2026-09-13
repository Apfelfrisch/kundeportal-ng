<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Requests;

use App\Domain\Usage\UsageSource;
use App\Integrations\CustomerDataApi\Data\UsageBucketData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\ProvidesNotFoundMessages;
use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;
use Saloon\Enums\Method;
use Saloon\Http\Request;
use Saloon\Http\Response;

/**
 * GET /contract/{contractNumber}/{billed|unbilled}-load-profiles/usage?from&until&resolution —
 * usage and cost split summed per bucket (`hour`, `day` or `month`) for
 * slots starting in [from, until).
 */
final class GetUsageRequest extends Request implements ProvidesNotFoundMessages
{
    protected Method $method = Method::GET;

    public function __construct(
        private readonly int $contractNumber,
        private readonly UsageSource $source,
        private readonly CarbonImmutable $from,
        private readonly CarbonImmutable $until,
        private readonly string $resolution,
    ) {}

    public function resolveEndpoint(): string
    {
        return "/contract/{$this->contractNumber}/{$this->source->path()}/usage";
    }

    /**
     * @return array<string, string>
     */
    protected function defaultQuery(): array
    {
        return [
            'from' => $this->from->format('Y-m-d H:i:s'),
            'until' => $this->until->format('Y-m-d H:i:s'),
            'resolution' => $this->resolution,
        ];
    }

    /**
     * @return list<UsageBucketData>
     */
    public function createDtoFromResponse(Response $response): array
    {
        $rows = Payload::of($response->json())->optionalPayloadList('data')
            ?? throw new ContractNotFoundException($this->emptyResponseMessage());

        return array_map(UsageBucketData::fromPayload(...), $rows);
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
