<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\ContractToUser;
use App\Models\User;

final class UsersIndexTest extends AdminTestCase
{
    public function test_customers_are_listed_with_their_assignments_and_flags(): void
    {
        $admin = $this->admin();

        $user = User::factory()->withoutPassword()->create(['name' => 'Erika Musterfrau']);
        ContractToUser::factory()->for($user)->create(['contract_number' => 123456]);
        ContractToUser::factory()->for($user)->unconfirmed()->create(['contract_number' => 654321]);

        $this->actingAs($admin)
            ->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $user->id)
            ->assertJsonPath('data.0.name', 'Erika Musterfrau')
            ->assertJsonPath('data.0.email', $user->email)
            ->assertJsonPath('data.0.email_verified', false)
            ->assertJsonPath('data.0.password_set', false)
            ->assertJsonCount(2, 'data.0.contract_assignments')
            ->assertJsonPath('data.0.contract_assignments.0.contract_number', 123456)
            ->assertJsonPath('data.0.contract_assignments.0.confirmed', true)
            ->assertJsonPath('data.0.contract_assignments.1.contract_number', 654321)
            ->assertJsonPath('data.0.contract_assignments.1.confirmed', false)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_admins_do_not_show_up_in_the_listing(): void
    {
        $admin = $this->admin();
        User::factory()->create();

        $this->actingAs($admin)
            ->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_the_listing_can_be_filtered(): void
    {
        $admin = $this->admin();

        $erika = User::factory()->create(['name' => 'Erika Musterfrau', 'email' => 'erika@example.org']);
        User::factory()->create(['name' => 'Max Mustermann', 'email' => 'max@example.org']);

        $this->actingAs($admin)
            ->getJson('/api/admin/users?name=Erika')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $erika->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/users?email=erika@')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $erika->id);

        $this->actingAs($admin)
            ->getJson("/api/admin/users?id={$erika->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $erika->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/users?name=Niemand')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_verified_and_password_filters_work(): void
    {
        $admin = $this->admin();

        $withPassword = User::factory()->create();
        $withoutPassword = User::factory()->withoutPassword()->create();

        $this->actingAs($admin)
            ->getJson('/api/admin/users?has_set_password=yes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $withPassword->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/users?verified=unverified')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $withoutPassword->id);
    }

    public function test_the_listing_paginates_25_users_per_page(): void
    {
        $admin = $this->admin();
        User::factory()->count(26)->create();

        $this->actingAs($admin)
            ->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonCount(25, 'data')
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.total', 26);

        $this->actingAs($admin)
            ->getJson('/api/admin/users?page=2')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.current_page', 2);
    }
}
