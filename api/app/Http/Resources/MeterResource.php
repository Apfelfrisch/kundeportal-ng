<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Integrations\CustomerDataApi\Data\MeterData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class MeterResource extends JsonResource
{
    public function __construct(
        private readonly MeterData $meter,
    ) {
        parent::__construct($meter);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->meter->id,
            'meter_number' => $this->meter->meterNumber,
            'type' => $this->meter->type,
            'smart_meter' => $this->meter->smartMeter,
        ];
    }
}
