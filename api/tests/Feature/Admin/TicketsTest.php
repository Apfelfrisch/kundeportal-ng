<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\CustomerMessageStatus;
use App\Models\CustomerMessage;
use App\Models\User;

final class TicketsTest extends AdminTestCase
{
    public function test_tickets_are_listed_with_customer_and_caseworker(): void
    {
        $admin = $this->admin();
        $customer = User::factory()->create();

        $ticket = CustomerMessage::factory()
            ->inProcess($admin->id)
            ->create([
                'customer_user_id' => (string) $customer->id,
                'contract_number' => '123456',
                'form_type' => 'bank',
                'data' => ['iban' => 'DE02120300000000202051'],
            ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/tickets')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ticket->id)
            ->assertJsonPath('data.0.form_type', 'bank')
            ->assertJsonPath('data.0.contract_number', '123456')
            ->assertJsonPath('data.0.data.iban', 'DE02120300000000202051')
            ->assertJsonPath('data.0.status.value', 'in_process')
            ->assertJsonPath('data.0.status.label', 'in Arbeit')
            ->assertJsonPath('data.0.customer.id', $customer->id)
            ->assertJsonPath('data.0.customer.email', $customer->email)
            ->assertJsonPath('data.0.caseworker.id', $admin->id)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_tickets_can_be_filtered_by_status(): void
    {
        $admin = $this->admin();

        $open = CustomerMessage::factory()->create();
        $inProcess = CustomerMessage::factory()->inProcess($admin->id)->create();
        $processed = CustomerMessage::factory()->processed($admin->id)->create();

        $this->actingAs($admin)
            ->getJson('/api/admin/tickets?status=open')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $open->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/tickets?status=in_process')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $inProcess->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/tickets?status=processed')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $processed->id);
    }

    public function test_tickets_can_be_filtered_by_contract_number_caseworker_name_and_email(): void
    {
        $admin = $this->admin();
        $otherAdmin = $this->admin();

        $erika = User::factory()->create(['name' => 'Erika Musterfrau', 'email' => 'erika@example.org']);
        $max = User::factory()->create(['name' => 'Max Mustermann', 'email' => 'max@example.org']);

        $erikaTicket = CustomerMessage::factory()->inProcess($admin->id)->create([
            'customer_user_id' => (string) $erika->id,
            'contract_number' => '123456',
        ]);
        $maxTicket = CustomerMessage::factory()->inProcess($otherAdmin->id)->create([
            'customer_user_id' => (string) $max->id,
            'contract_number' => '654321',
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/tickets?contract_number=123456')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $erikaTicket->id);

        $this->actingAs($admin)
            ->getJson("/api/admin/tickets?caseworker={$otherAdmin->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $maxTicket->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/tickets?name=Erika')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $erikaTicket->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/tickets?email=max@')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $maxTicket->id);
    }

    public function test_tickets_paginate_20_per_page(): void
    {
        $admin = $this->admin();
        CustomerMessage::factory()->count(21)->create();

        $this->actingAs($admin)
            ->getJson('/api/admin/tickets')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.total', 21);
    }

    public function test_every_status_transition_assigns_the_acting_admin_as_caseworker(): void
    {
        $admin = $this->admin();
        $otherAdmin = $this->admin();

        foreach ([
            'open' => CustomerMessageStatus::UnProcessed,
            'in_process' => CustomerMessageStatus::InProcess,
            'processed' => CustomerMessageStatus::Processed,
        ] as $apiStatus => $expected) {
            $ticket = CustomerMessage::factory()->inProcess($otherAdmin->id)->create();

            $this->actingAs($admin)
                ->putJson("/api/admin/tickets/{$ticket->id}/status", ['status' => $apiStatus])
                ->assertOk()
                ->assertJsonPath('data.id', $ticket->id)
                ->assertJsonPath('data.status.value', $apiStatus)
                ->assertJsonPath('data.caseworker.id', $admin->id);

            $ticket->refresh();
            $this->assertSame($expected, $ticket->status);
            $this->assertSame($admin->id, $ticket->caseworker);
        }
    }

    public function test_an_invalid_status_is_rejected(): void
    {
        $ticket = CustomerMessage::factory()->create();

        $this->actingAs($this->admin())
            ->putJson("/api/admin/tickets/{$ticket->id}/status", ['status' => 'done'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_an_unknown_ticket_yields_404(): void
    {
        $this->actingAs($this->admin())
            ->putJson('/api/admin/tickets/999999/status', ['status' => 'processed'])
            ->assertNotFound();
    }
}
