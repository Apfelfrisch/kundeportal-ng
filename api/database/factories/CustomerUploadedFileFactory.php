<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\CustomerMessage;
use App\Models\CustomerUploadedFile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomerUploadedFile>
 */
final class CustomerUploadedFileFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_message_id' => CustomerMessage::factory(),
            'user_id' => fake()->numberBetween(1, 100),
            'customer_user_id' => User::factory(),
            'name' => fake()->word().'.pdf',
            'path' => 'mailbox/'.fake()->uuid().'.pdf',
            'mime_type' => 'application/pdf',
            'processed' => false,
        ];
    }
}
