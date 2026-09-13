<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Data;

use App\Integrations\Support\Payload;
use Carbon\CarbonImmutable;

/**
 * Field mapping ported from the old ContractRepository::invoices().
 */
final readonly class InvoiceData
{
    public function __construct(
        public int $id,
        public string $invoiceNumber,
        public int $contractNumber,
        public ?CarbonImmutable $invoiceDate,
        public ?CarbonImmutable $invoiceFrom,
        public ?float $consumption,
        public ?string $filename,
        public ?string $completeFilePath,
        public ?CarbonImmutable $canceledAt,
        /** Last day of the invoiced period (inclusive). */
        public ?CarbonImmutable $invoiceUntil = null,
        /** Net amount in cents. */
        public ?int $amountCents = null,
        public ?int $taxAmountCents = null,
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
            invoiceNumber: $payload->string('invoice_number'),
            contractNumber: $payload->int('contract_id'),
            invoiceDate: $payload->nullableDate('invoice_date'),
            invoiceFrom: $payload->nullableDate('invoice_from'),
            consumption: $payload->nullableFloat('consumption'),
            filename: $payload->nullableString('filename'),
            completeFilePath: $payload->nullableString('complete_file_path'),
            canceledAt: $payload->nullableDate('canceled_at'),
            invoiceUntil: $payload->optionalDate('invoice_until'),
            amountCents: $payload->optionalInt('amount'),
            taxAmountCents: $payload->optionalInt('tax_amount'),
        );
    }
}
