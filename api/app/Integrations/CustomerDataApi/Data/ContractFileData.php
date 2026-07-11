<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;

/**
 * Field mapping ported from the old ContractRepository::contractFiles().
 * The old code read `created_at` with `?? null`, hence optional here.
 */
final readonly class ContractFileData
{
    public function __construct(
        public int $id,
        public int $contractNumber,
        public ?string $body,
        public ?string $tag,
        public ?string $path,
        public ?string $filename,
        public ?CarbonImmutable $createdAt,
    ) {}

    /**
     * @param  array<array-key, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return self::fromPayload(Payload::of($data));
    }

    public static function fromPayload(Payload $payload): self
    {
        return new self(
            id: $payload->int('id'),
            contractNumber: $payload->int('contract_id'),
            body: $payload->nullableString('body'),
            tag: $payload->nullableString('tag'),
            path: $payload->nullableString('path'),
            filename: $payload->nullableString('filename'),
            createdAt: $payload->optionalDate('created_at'),
        );
    }
}
