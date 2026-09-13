<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Integrations\CustomerDataApi\Data\InvoiceData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class InvoiceResource extends JsonResource
{
    public function __construct(
        private readonly InvoiceData $invoice,
    ) {
        parent::__construct($invoice);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->invoice->id,
            'invoice_number' => $this->invoice->invoiceNumber,
            'invoice_date' => $this->invoice->invoiceDate?->toDateString(),
            'invoice_from' => $this->invoice->invoiceFrom?->toDateString(),
            'invoice_until' => $this->invoice->invoiceUntil?->toDateString(),
            'consumption' => $this->invoice->consumption,
            'amount_cents' => $this->invoice->amountCents,
            'tax_amount_cents' => $this->invoice->taxAmountCents,
            'canceled_at' => $this->invoice->canceledAt?->toDateString(),
        ];
    }
}
