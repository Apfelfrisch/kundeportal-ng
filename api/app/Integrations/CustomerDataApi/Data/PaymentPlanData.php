<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;

/**
 * Field mapping ported from the old ContractRepository::paymentPlans().
 * `amount` is in euro cents (old Contract::formattedAmount() divided by 100).
 */
final readonly class PaymentPlanData
{
    public function __construct(
        public int $id,
        public int $contractNumber,
        public ?CarbonImmutable $validFrom,
        public ?CarbonImmutable $validUntil,
        public ?CarbonImmutable $nextPayment,
        public ?string $type,
        public ?string $expression,
        public ?float $amount,
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
            validFrom: $payload->nullableDate('valid_from'),
            validUntil: $payload->nullableDate('valid_until'),
            nextPayment: $payload->nullableDate('next_payment'),
            type: $payload->nullableString('type'),
            expression: $payload->nullableString('expression'),
            amount: $payload->nullableFloat('amount'),
        );
    }
}
