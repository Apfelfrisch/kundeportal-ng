<?php

declare(strict_types=1);

namespace App\Domain\Usage;

use App\Integrations\CustomerDataApi\Data\InvoiceData;
use Carbon\CarbonImmutable;

/**
 * The invoices that cover a usage window completely: not canceled, with a
 * known period and amount, and tiling the window without gap or overlap.
 * The chart sums quarter hours, the invoice bills whole kilowatt hours, so
 * for such a window the invoiced amount is the figure the customer knows.
 */
final readonly class InvoicedPeriod
{
    /**
     * @param  list<string>  $invoiceNumbers
     */
    private function __construct(
        public int $amountCents,
        public float $consumptionKwh,
        public array $invoiceNumbers,
    ) {}

    /**
     * @param  list<InvoiceData>  $invoices
     * @param  CarbonImmutable  $from  start of a day
     * @param  CarbonImmutable  $until  exclusive end of the window, start of a day
     */
    public static function covering(array $invoices, CarbonImmutable $from, CarbonImmutable $until): ?self
    {
        $candidates = [];

        foreach ($invoices as $invoice) {
            if ($invoice->canceledAt !== null || $invoice->invoiceFrom === null || $invoice->invoiceUntil === null || $invoice->amountCents === null) {
                continue;
            }

            if ($invoice->invoiceFrom >= $from && $invoice->invoiceUntil < $until) {
                $candidates[] = [
                    'from' => $invoice->invoiceFrom->startOfDay(),
                    'next' => $invoice->invoiceUntil->startOfDay()->addDay(),
                    'amount' => $invoice->amountCents,
                    'consumption' => $invoice->consumption ?? 0.0,
                    'number' => $invoice->invoiceNumber,
                ];
            }
        }

        if ($candidates === []) {
            return null;
        }

        usort($candidates, static fn (array $a, array $b): int => $a['from'] <=> $b['from']);

        $expected = $from;

        foreach ($candidates as $candidate) {
            if (! $candidate['from']->equalTo($expected)) {
                return null;
            }

            $expected = $candidate['next'];
        }

        if (! $expected->equalTo($until)) {
            return null;
        }

        return new self(
            array_sum(array_column($candidates, 'amount')),
            array_sum(array_column($candidates, 'consumption')),
            array_column($candidates, 'number'),
        );
    }
}
