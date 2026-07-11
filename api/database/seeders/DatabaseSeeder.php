<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ContractToUser;
use App\Models\User;
use Illuminate\Database\Seeder;

final class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::factory()->admin()->create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
        ]);

        $customer = User::factory()->create([
            'name' => 'Max Mustermann',
            'email' => 'kunde@example.com',
            'customer_number' => '10001',
        ]);

        ContractToUser::factory()->for($customer)->create([
            'contract_number' => 100001,
        ]);
    }
}
