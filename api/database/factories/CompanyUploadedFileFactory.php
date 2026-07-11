<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\CompanyMessage;
use App\Models\CompanyUploadedFile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyUploadedFile>
 */
final class CompanyUploadedFileFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_message_id' => CompanyMessage::factory(),
            'customer_user_id' => User::factory(),
            'user_id' => fake()->numberBetween(1, 100),
            'name' => fake()->word().'.pdf',
            'path' => 'mailbox/'.fake()->uuid().'.pdf',
            'mime_type' => 'application/pdf',
            'processed' => false,
        ];
    }
}
