<?php

declare(strict_types=1);

namespace App\Http\Resources\Charts;

use App\Integrations\CustomerDataApi\Data\EdiLoadProfileEntryData;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A center day ± 1 day of EDI (smart meter) 15-minute usage slots. The old
 * payload fields `reading_start`/`reading_end`/`amount` are normalized to
 * the same `from`/`until`/`usage_kwh` keys the billed chart uses.
 */
final class EdiLoadProfileDayResource extends JsonResource
{
    /**
     * @param  list<EdiLoadProfileEntryData>  $entries
     */
    public function __construct(
        private readonly CarbonImmutable $date,
        private readonly array $entries,
    ) {
        parent::__construct($entries);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'date' => $this->date->toDateString(),
            'from' => $this->date->subDay()->toDateString(),
            'until' => $this->date->addDay()->toDateString(),
            'entries' => array_map(
                static fn (EdiLoadProfileEntryData $entry): array => [
                    'from' => $entry->readingStart->format('Y-m-d\TH:i:s'),
                    'until' => $entry->readingEnd->format('Y-m-d\TH:i:s'),
                    'usage_kwh' => $entry->amount,
                ],
                $this->entries,
            ),
            'navigation' => [
                'prev_date' => $this->date->subDay()->toDateString(),
                'next_date' => $this->date->addDay()->toDateString(),
            ],
        ];
    }
}
