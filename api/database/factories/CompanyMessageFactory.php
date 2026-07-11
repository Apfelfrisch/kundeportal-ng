<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\CompanyMessage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyMessage>
 */
final class CompanyMessageFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_user_id' => User::factory(),
            'contract_number' => (string) fake()->numberBetween(100000, 999999),
            'subject' => fake()->sentence(3),
            'message' => fake()->paragraph(),
            'file' => null,
            'read_at' => null,
        ];
    }

    public function read(): static
    {
        return $this->state(fn (array $attributes): array => [
            'read_at' => now(),
        ]);
    }
}
