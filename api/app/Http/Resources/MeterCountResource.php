<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\MeterCountReadingKind;
use App\Enums\MeterCountReadingType;
use App\Integrations\CustomerDataApi\Data\MeterCountData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class MeterCountResource extends JsonResource
{
    public function __construct(
        private readonly MeterCountData $meterCount,
    ) {
        parent::__construct($meterCount);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->meterCount->id,
            'meter_number' => $this->meterCount->meterNumber,
            'reading_kind' => $this->readingKind(),
            'reading_type' => $this->readingType(),
            'reading_date' => $this->meterCount->readingDate?->toDateString(),
            'meter_count_1' => $this->meterCount->meterCount1,
            'meter_count_2' => $this->meterCount->meterCount2,
            'meter_count_3' => $this->meterCount->meterCount3,
            'yearly_usage' => $this->meterCount->yearlyUsage,
        ];
    }

    /**
     * @return array{value: string, label: string}|null
     */
    private function readingKind(): ?array
    {
        if ($this->meterCount->readingKind === null) {
            return null;
        }

        return [
            'value' => $this->meterCount->readingKind,
            'label' => MeterCountReadingKind::fromKvsId($this->meterCount->readingKind)->value,
        ];
    }

    /**
     * @return array{value: string, label: string}|null
     */
    private function readingType(): ?array
    {
        if ($this->meterCount->readingType === null) {
            return null;
        }

        return [
            'value' => $this->meterCount->readingType,
            'label' => MeterCountReadingType::fromKvsId($this->meterCount->readingType)->value,
        ];
    }
}
