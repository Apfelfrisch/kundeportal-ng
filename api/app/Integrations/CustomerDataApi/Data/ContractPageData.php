<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;

/**
 * One page of GET /contracts — a Laravel paginator payload on the KVS side
 * (`data` + `meta.current_page` / `meta.last_page` / `meta.total`).
 */
final readonly class ContractPageData
{
    /**
     * @param  list<ContractData>  $items
     */
    public function __construct(
        public array $items,
        public int $currentPage,
        public int $lastPage,
        public int $total,
    ) {}

    /**
     * @param  array<array-key, mixed>  $data  the full response body
     */
    public static function fromArray(array $data): self
    {
        $payload = Payload::of($data);
        $meta = $payload->payload('meta');

        return new self(
            items: array_map(
                static fn (Payload $contract): ContractData => ContractData::fromPayload($contract),
                $payload->payloadList('data'),
            ),
            currentPage: $meta->int('current_page'),
            lastPage: $meta->int('last_page'),
            total: $meta->int('total'),
        );
    }
}
