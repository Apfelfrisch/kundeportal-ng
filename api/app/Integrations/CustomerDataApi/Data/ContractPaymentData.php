<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;

/**
 * Field mapping ported from the old ContractRepository::contractPayments():
 * `should_amount` → outgoingPayment, `have_amount` → incomingPayment.
 *
 * The old repository hard-coded `payment_type` to the literal string "type";
 * that placeholder was never a real API field and is not ported.
 */
final readonly class ContractPaymentData
{
    public function __construct(
        public int $id,
        public int $contractNumber,
        public ?float $outgoingPayment,
        public ?float $incomingPayment,
        public ?CarbonImmutable $bookingDate,
        public ?string $counterAccount,
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
            outgoingPayment: $payload->nullableFloat('should_amount'),
            incomingPayment: $payload->nullableFloat('have_amount'),
            bookingDate: $payload->nullableDate('booking_date'),
            counterAccount: $payload->nullableString('counter_account'),
        );
    }
}
