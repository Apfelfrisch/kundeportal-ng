<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ContractToUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ContractToUserScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_unconfirmed_assignments_are_hidden_by_default(): void
    {
        $user = User::factory()->create();
        ContractToUser::factory()->for($user)->create(['contract_number' => 100001]);
        ContractToUser::factory()->for($user)->unconfirmed()->create(['contract_number' => 100002]);

        self::assertSame([100001], $user->contractNumbers());
        self::assertSame(1, ContractToUser::query()->count());
        self::assertSame(2, ContractToUser::withUnconfirmed()->count());
    }

    public function test_deleting_a_user_cascades_to_assignments(): void
    {
        $user = User::factory()->create();
        ContractToUser::factory()->for($user)->create();

        $user->delete();

        self::assertSame(0, ContractToUser::withUnconfirmed()->count());
    }
}
