<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\MarketPriceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Spot electricity price slice, fetched periodically from the
 * market-partner API.
 *
 * @property-read int $id
 * @property CarbonImmutable $starts_at
 * @property CarbonImmutable $ends_at
 * @property int $cent_per_mwh
 */
final class MarketPrice extends Model
{
    /** @use HasFactory<MarketPriceFactory> */
    use HasFactory;

    protected $fillable = [
        'starts_at',
        'ends_at',
        'cent_per_mwh',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
            'cent_per_mwh' => 'integer',
        ];
    }
}
