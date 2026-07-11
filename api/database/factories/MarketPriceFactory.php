<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\MarketPrice;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MarketPrice>
 */
final class MarketPriceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = fake()->unique()->dateTimeBetween('-1 week', '+1 day');

        return [
            'starts_at' => $start,
            'ends_at' => \Carbon\CarbonImmutable::instance($start)->addMinutes(15),
            'cent_per_mwh' => fake()->numberBetween(-500, 20000),
        ];
    }
}
