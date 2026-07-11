<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CustomerMessageStatus;
use App\Models\CustomerMessage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomerMessage>
 */
final class CustomerMessageFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'form_type' => 'contact',
            'customer_user_id' => User::factory(),
            'contract_number' => (string) fake()->numberBetween(100000, 999999),
            'user_id' => (string) fake()->numberBetween(10000, 99999),
            'data' => ['message' => fake()->sentence()],
            'processed' => false,
            'status' => CustomerMessageStatus::UnProcessed,
            'caseworker' => null,
        ];
    }

    public function inProcess(?int $caseworker = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => CustomerMessageStatus::InProcess,
            'caseworker' => $caseworker,
        ]);
    }

    public function processed(?int $caseworker = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => CustomerMessageStatus::Processed,
            'caseworker' => $caseworker,
        ]);
    }
}
