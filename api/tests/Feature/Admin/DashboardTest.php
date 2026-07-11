<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\CustomerMessage;

final class DashboardTest extends AdminTestCase
{
    public function test_the_dashboard_counts_open_in_process_and_own_tickets(): void
    {
        $admin = $this->admin();
        $otherAdmin = $this->admin();

        CustomerMessage::factory()->count(3)->create();
        CustomerMessage::factory()->count(2)->inProcess($admin->id)->create();
        CustomerMessage::factory()->inProcess($otherAdmin->id)->create();
        CustomerMessage::factory()->processed($otherAdmin->id)->create();

        $this->actingAs($admin)
            ->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.tickets.open', 3)
            ->assertJsonPath('data.tickets.in_process', 3)
            ->assertJsonPath('data.tickets.mine', 2);
    }

    public function test_an_empty_queue_yields_zero_counts(): void
    {
        $this->actingAs($this->admin())
            ->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.tickets.open', 0)
            ->assertJsonPath('data.tickets.in_process', 0)
            ->assertJsonPath('data.tickets.mine', 0);
    }
}
