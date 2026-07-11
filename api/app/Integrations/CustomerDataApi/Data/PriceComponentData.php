<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;

final readonly class PriceComponentData
{
    public const string SUPPLIER_WORKING_PRICE = 'supplierWorkingPrice';

    public const string SUPPLIER_PURCHASE_PRICE = 'supplierPurchasePrice';

    public const string TYPE_WORKING_PRICE = 'working_price';

    public function __construct(
        public string $name,
        public float $amount,
        public ?string $type,
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
            name: $payload->string('name'),
            amount: $payload->float('amount'),
            type: $payload->optionalString('type'),
        );
    }
}
