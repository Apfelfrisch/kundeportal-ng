<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ContractToUser;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContractToUser>
 */
final class ContractToUserFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'contract_number' => fake()->unique()->numberBetween(100000, 999999),
            'confirmed' => true,
        ];
    }

    public function unconfirmed(): static
    {
        return $this->state(fn (array $attributes): array => [
            'confirmed' => false,
        ]);
    }
}
